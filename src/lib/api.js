import { supabase } from "./supabase";

const ok = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const normalizePhone = (raw) =>
  "+855" + raw.replace(/\D/g, "").replace(/^0/, "");
export const prettyPhone = (e164) => {
  const d = "0" + e164.replace("+855", "");
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`.trim();
};

export const findMember = async (phone) =>
  ok(
    await supabase
      .from("members_with_age")
      .select("*")
      .eq("phone", phone)
      .maybeSingle(),
  );

export const getMember = async (id) =>
  ok(
    await supabase
      .from("members_with_age")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
  );

export const createMember = async (phone, name, gender, age) => {
  if (
    !name.trim() ||
    !["Female", "Male"].includes(gender) ||
    !Number.isInteger(age) ||
    age < 0
  ) {
    throw new Error("Name, gender, and a valid age are required.");
  }

  const member = ok(
    await supabase
      .from("members")
      .insert({
        phone,
        name,
        gender,
        age,
        points: 0,
        saved_this_month: 0,
      })
      .select()
      .single(),
  );
  await supabase
    .from("activity")
    .insert({
      member_id: member.id,
      label: "Joined FairPrice Membership",
      tag: "Member Price",
    });
  const memberWithAge = await getMember(member.id);
  if (!memberWithAge) {
    throw new Error("Member was created but could not be reloaded.");
  }
  return memberWithAge;
};

export const updateName = async (id, name) =>
  ok(
    await supabase
      .from("members")
      .update({ name })
      .eq("id", id)
      .select()
      .single(),
  );

export const unlockAppReward = async (member) => {
  const { count } = await supabase
    .from("rewards")
    .select("id", { count: "exact", head: true })
    .eq("member_id", member.id)
    .eq("title", "App Welcome Reward");
  if (!count) {
    ok(
      await supabase.from("rewards").insert({
        member_id: member.id,
        title: "App Welcome Reward",
        amount: 2,
        note: "One-time reward for activating your membership in the app.",
      }),
    );
    await supabase
      .from("activity")
      .insert({
        member_id: member.id,
        label: "App linked to membership",
        tag: "+$2 reward",
      });
  }
  ok(
    await supabase
      .from("members")
      .update({ app_linked: true })
      .eq("id", member.id)
      .select()
      .single(),
  );
  const memberWithAge = await getMember(member.id);
  if (!memberWithAge) {
    throw new Error("Member was updated but could not be reloaded.");
  }
  return memberWithAge;
};

export const loadHome = async (memberId) => {
  const [deals, prices, rewards, activity] = await Promise.all([
    supabase.from("deals").select("*").order("id"),
    supabase.from("member_prices").select("*").order("id"),
    supabase
      .from("rewards")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  return {
    deals: ok(deals),
    prices: ok(prices),
    rewards: ok(rewards),
    activity: ok(activity),
  };
};


/* ---------- Deals admin + image upload ---------- */
const MAX_MB = 3

export const uploadDealImage = async (file) => {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG, PNG or WebP).')
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Image is too large. Max ${MAX_MB} MB.`)
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `deals/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('deal-images')
    .upload(path, file, { contentType: file.type, cacheControl: '3600' })
  if (error) throw error
  return supabase.storage.from('deal-images').getPublicUrl(path).data.publicUrl
}

export const listDeals = async () =>
  ok(await supabase.from('deals').select('*').order('id', { ascending: false }))

export const saveDeal = async (deal) => {
  const row = {
    name: deal.name, emoji: deal.emoji || null, image_url: deal.image_url || null,
    price: Number(deal.price), normal_price: Number(deal.normal_price),
  }
  return deal.id
    ? ok(await supabase.from('deals').update(row).eq('id', deal.id).select().single())
    : ok(await supabase.from('deals').insert(row).select().single())
}

export const deleteDeal = async (id) => ok(await supabase.from('deals').delete().eq('id', id))