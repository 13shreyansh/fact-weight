import { all, get, put, scrape, hash, judge } from "../signal/providers.mjs";
import { load } from "cheerio";
import { plainText } from "../signal/passages.mjs";
import { measure } from "../signal/detect.mjs";
import { enrich } from "../signal/enrich.mjs";
import { finalize } from "../signal/store.mjs";
import { ensurePack } from "../signal/packs.mjs";
function tgPost(d, key) {
  const $ = load(d.html?.data || ""),
    e = $(".tgme_widget_message")
      .filter((i, el) => $(el).attr("data-post") === key)
      .first();
  if (!e.length) return null;
  const text = e.find(".tgme_widget_message_text").text(),
    postedAt = e.find("time[datetime]").first().attr("datetime");
  if (!text || !postedAt) return null;
  const handle = key.split("/")[0],
    p = {
      id: "tg-" + key,
      url: "https://t.me/" + key,
      text,
      platform: "TG",
      handle,
      accountId: "tg-" + handle,
      language: /[А-Яа-я]/.test(text) ? "ru" : "en",
      postedAt,
      links: e
        .find(".tgme_widget_message_text a[href]")
        .map((i, a) => $(a).attr("href"))
        .get()
        .filter((u) => !/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//.test(u)),
      call: d._call,
    };
  put("post", p.id, p);
  put("account", p.accountId, {
    id: p.accountId,
    handle,
    url: "https://t.me/" + handle,
    platform: "TG",
    createdAt: null,
    followers: null,
  });
  return p;
}
const first = get("candidate", "a6b0d22b1d61");
const origin = tgPost(
  get("origin-source", "https://t.me/s/InfodefSpectrum?before=31486"),
  "InfodefSpectrum/31483",
);
if (origin) {
  const comparison = await judge({
    posts: [
      {
        id: "network",
        text: first.posts.find((p) => p.language === "en").text,
      },
      { id: "origin", text: origin.text },
    ],
    sources: [],
    task: "Check whether this cited channel post is the same specific article translated by the network. Preserve distinctions between an unofficial proposal and confirmed demands.",
  });
  if (comparison.data.sameNarrative) {
    first.origins = [
      {
        ...origin,
        relationship: "Cited Telegram source; same narrative confirmed",
        judgement: comparison,
      },
    ];
    first.posts = [
      ...new Map([...first.posts, origin].map((p) => [p.id, p])).values(),
    ];
  }
}
const second = get("candidate", "aa9426e2b5e6"),
  duplicate = get("candidate", "n9c6063138ac");
if (duplicate) {
  second.posts = [
    ...new Map(
      [...second.posts, ...duplicate.posts].map((p) => [p.id, p]),
    ).values(),
  ];
  const old = get("push", duplicate.id);
  if (old)
    put("push", old.id, {
      ...old,
      excluded: true,
      mergedInto: second.id,
      excludedReason: "Another language edition of this same push",
    });
}
const interview = get(
  "origin-source",
  "https://svpressa.ru/politic/article/540809/",
);
if (interview?.markdown?.data)
  second.origins = [
    {
      id: "interview-" + hash("540809").slice(0, 8),
      url: "https://svpressa.ru/politic/article/540809/",
      text: plainText(interview.markdown.data).slice(0, 24000),
      title: interview.metadata?.title,
      platform: "NW",
      handle: "svpressa.ru",
      language: "ru",
      postedAt: interview.metadata?.publishedTime || null,
      call: interview._call,
      relationship:
        "Original interview explicitly linked by the copied article",
    },
  ];
const third = get("candidate", "nab032987aff");
if (third) {
  let page = await scrape("https://t.me/s/lomovkaa");
  for (let n = 0; n < 8; n++) {
    put("telegram", "lomovkaa" + (n ? "/trace-" + n : ""), {
      ...page,
      channel: "lomovkaa",
    });
    const $ = load(page.html?.data || ""),
      eligible = [];
    $(".tgme_widget_message").each((i, el) => {
      const e = $(el),
        text = e.find(".tgme_widget_message_text").text();
      if (/1997/.test(text) && /НАТО|NATO/.test(text)) {
        const p = tgPost(page, e.attr("data-post"));
        if (p) eligible.push(p);
      }
    });
    if (eligible.length) {
      for (const p of eligible) {
        const match = await judge({
          posts: [
            {
              id: "network",
              text: third.posts.find((p) => p.language === "en").text,
            },
            { id: "origin", text: p.text },
          ],
          sources: [],
          task: "Check the same specific claim, not generic overlap.",
        });
        if (match.data.sameNarrative) {
          third.origins = [
            {
              ...p,
              relationship: "Cited Telegram source; same narrative confirmed",
              judgement: match,
            },
          ];
          third.posts = [
            ...new Map([...third.posts, p].map((p) => [p.id, p])).values(),
          ];
          break;
        }
      }
      if (third.origins?.length) break;
    }
    const ids = $(".tgme_widget_message")
      .map((i, el) => Number(($(el).attr("data-post") || "").split("/").at(-1)))
      .get()
      .filter(Boolean);
    if (!ids.length) break;
    page = await scrape("https://t.me/s/lomovkaa?before=" + Math.min(...ids));
  }
}
for (const c of [first, second, third].filter(Boolean)) {
  c.posts.sort((a, b) => Date.parse(a.postedAt) - Date.parse(b.postedAt));
  c.accounts = [...new Set(c.posts.map((p) => p.accountId))]
    .map((id) => get("account", id))
    .filter(Boolean);
  Object.assign(
    c,
    measure(
      c.posts,
      all("post").filter((p) => /nato|нато|ukrain|украин|україн/i.test(p.text)),
      c.accounts,
    ),
  );
  put("candidate", c.id, c);
  const result = await enrich(c, get("watch", "baltics"));
  put("assessed", c.id, result);
  const p = finalize(result);
  if (p) {
    const packed = await ensurePack(p);
    console.log(
      "VERIFIED LIVE PUSH",
      p.id,
      p.verdict,
      p.posts.length,
      p.accounts.length,
      "origins",
      p.origins?.length || 0,
      "pickups",
      p.pickups?.length || 0,
      "quotes",
      p.evidence.length,
      packed.push.pack.size,
    );
  }
}
