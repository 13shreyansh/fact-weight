import { scrape, put } from "../signal/providers.mjs";
const urls = [
  "https://www.justice.gov/d9/2024-09/doppelganger_affidavit_9.4.24.pdf",
  "https://checkfirst.network/wp-content/uploads/2024/06/Operation_Overload_WEB.pdf",
  "https://checkfirst.network/wp-content/uploads/2024/09/Operation_Overload_Activity_Update_September_2024.pdf",
  "https://www.sgdsn.gouv.fr/files/files/20240212_NP_SGDSN_VIGINUM_PORTAL-KOMBAT-NETWORK_ENG_VF.pdf",
  "https://portal-kombat.com/",
  "https://estonia.news-pravda.com/",
  "https://latvia.news-pravda.com/",
  "https://lithuania.news-pravda.com/",
  "https://www.understandingwar.org/backgrounder/russian-offensive-campaign-assessment-november-14-2026",
  "https://www.oryxspioenkop.com/2022/02/attack-on-europe-documenting-equipment.html",
];
for (let i = 0; i < urls.length; i += 5)
  await Promise.allSettled(
    urls.slice(i, i + 5).map(async (u) => {
      try {
        const d = await scrape(u);
        put("reference", u, d);
        console.log(u, d.markdown?.data?.length);
      } catch (e) {
        console.log(u, e.message);
      }
    }),
  );
