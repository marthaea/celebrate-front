/**
 * Blog posts, shown on /blog and /blog/<slug>. Search engines see each post's title, description
 * and date, and every post is listed in the sitemap.
 *
 * These are sample posts written to show the layout; edit them or replace them with your own.
 * To add a post, copy one entry and change it:
 * - `slug`: the address, /blog/<slug> (lowercase words joined by hyphens, never reused)
 * - `date`: YYYY-MM-DD; newest posts are shown first
 * - `author`: shown under the title; a first-person piece reads better with a named host, not "Celebrate team"
 * - `kind`: "story" for a first-person account (shown with a small quote mark), otherwise a practical guide
 * - `photo`: a key from site/src/photos.js, or a path such as "/blog/my-photo.jpg" for a file in site/public/blog/
 * - `body`: paragraphs as plain strings, `{ h: "Heading" }` for a heading, `{ list: ["…", "…"] }` for a list
 */
export const POSTS = [
  {
    slug: "plan-an-event-budget",
    title: "How to plan an event budget that holds",
    description: "I promised my sister a colourful introduction on a tight budget, and nearly broke that promise twice. Here is exactly how the numbers held, in the end.",
    date: "2026-11-12",
    author: "Flavia Nakimuli, planned her sister's introduction in Mukono",
    tag: "Budgeting",
    kind: "story",
    photo: "feature",
    body: [
      "My sister got engaged in June, and by the second week of July I was the one holding the spreadsheet. Not because I asked for the job. Because I am the one in the family who says \"and how much is that, exactly\" out loud, in meetings, in a voice everyone can hear. So it fell to me to turn a very happy phone call into a number we could actually afford, and then to keep that number honest for four months while every auntie, cousin and family friend added one more idea to the list.",
      "We landed on nine million shillings. Not because that is what a good introduction costs — there is no such thing, I now know, prices run from under three million to well over thirty — but because that is what our two families could put together without anyone going into debt over a party. I want to tell you how that number survived the next four months, because it very nearly didn't, twice.",
      { h: "The number came before the wishlist" },
      "The mistake I see friends make, and the one I almost made myself, is starting with the Pinterest board instead of the bank balance. We did it the other way round. One Sunday after church, my mother, my sister, our aunt and I sat with tea and agreed the one figure, out loud, in front of each other, so nobody could quietly revise it upward later in a side conversation. Then we wrote down who was contributing what, and we only counted money that had actually been promised in that room, not money someone hoped a generous uncle might produce closer to the day.",
      "That last part mattered more than I expected. Three relatives each privately told different family members they would \"help with the drinks,\" and counting all three as real money would have left us short by nearly a million shillings two weeks before the date. In the end we put the plan on Celebrate and shared the link in the family WhatsApp group, so every contributor could see what their money was actually covering. People are far more generous when they can see the total move in front of them.",
      { h: "Where I nearly lost control of it" },
      "The first near-disaster was the cake. I fell for a five-tier showpiece at a cousin's wedding and decided ours needed one too, before we had even confirmed the venue — close to two and a half million shillings on its own, for something that gets cut, photographed for twenty minutes and mostly eaten by children. My sister talked me down.",
      "What saved us was doing the unglamorous things first: venue, tents and chairs, caterer, sound, in that order. Guests remember whether they had a seat in the shade and food that was still warm; they do not remember the cake nearly as vividly as the person who ordered it does. Once those big, boring categories were locked in and deposited, whatever was left could go on the cake, the gomesi fabric, the drone shots — the fun parts, which are rarely what makes or breaks the day.",
      { h: "Guests are a moving number, so I stopped guessing" },
      "Our guest list moved three times. It started at one hundred and eighty. Then my uncle, who was hosting the groom's side of the conversation, quietly decided the whole clan should be invited, and we were at two hundred and thirty before anyone had asked me. Food, chairs and drinks are all priced per guest or per hundred guests here, so a guest list that grows by fifty people is not a small adjustment — it is close to a third more on catering alone, and a bigger tent, and more chairs, and a caterer who now needs to recount portions.",
      "What I eventually learned to do was stop debating the guest number in principle and just update it the moment it changed, and let the plan recalculate itself rather than trying to do the arithmetic in my head during a phone call with my uncle. The morning after that conversation I updated the guest count and the whole quote moved in front of me — tents, plates, drinks, even the transport line — instead of me trying to multiply it out on a scrap of paper while also being annoyed with my uncle.",
      { h: "The ten per cent that saved the actual day" },
      "We held back a little under a million shillings, about ten per cent of the total, and did not assign it to anything in advance. I was tempted, twice, to spend it early on things that felt urgent at the time. I am very glad we didn't, because on the morning of the introduction it rained, properly rained, the kind of rain that turns a garden venue into a problem. We needed:",
      { list: [
        "A generator and extra lighting, because the rain had taken the power with it for two hours",
        "Fifteen more plates than planned, because guests from the groom's side brought people who had not been on either list",
        "A little extra for the tent crew, who came back at short notice to re-peg a marquee corner that had started to lean",
      ] },
      "All of it came out of that held-back ten per cent, and none of it required an emergency phone call to anyone asking for more money on the day itself. We did not use all of it — there was a little left over, which became, in the end, a small envelope for the new couple rather than a crisis for the family.",
      "If you take one thing from our four months of spreadsheets and family WhatsApp negotiations, let it be this: agree the number before the wishlist, lock in the categories your guests will actually notice first, update the guest count the moment it moves instead of arguing about it, and hold something back on purpose. The budget held. The introduction was loud and warm and a little bit damp, and nobody but me ever knew how close we came, twice, to it not holding at all.",
    ],
  },
  {
    slug: "introduction-ceremony-checklist",
    title: "An introduction ceremony checklist, from first meeting to the day",
    description: "Whatever your community calls it, the traditional introduction has many moving parts, several families to keep in step, and a calendar that fills up fast. Here is a working timeline, with the order that actually matters.",
    date: "2026-10-28",
    author: "Celebrate team",
    tag: "Planning",
    photo: "hero-left",
    body: [
      "Every region and family does the introduction its own way, with its own names, gifts, speeches and order of events, and no single checklist can capture every custom. What does carry across almost every family we have worked with is the shape of the planning itself: a handful of decisions that have to happen early because everything else depends on them, a middle stretch where the details get locked in, and a final week that is mostly about communication rather than new bookings. Use this as a starting skeleton and hang your own customs on it.",
      { h: "Three to six months before: the decisions nothing else can happen without" },
      "This stage is less about vendors and more about two families agreeing on the shape of the day. Rushing it tends to cost you later, because every later decision, from the tent size to the caterer's quote, depends on the numbers you set here.",
      { list: [
        "Agree the date with both families, and check it against any other family or church commitments already on the calendar",
        "Set the budget and the guest numbers for each side separately, since the two sides often arrive at very different expectations if nobody writes the figures down",
        "Book the venue or the home compound, and the tents if you are outdoors — venues and tent hire are the first things to be unavailable on popular weekend dates",
      ] },
      "It is worth being specific about the guest count at this stage, even if it feels early. A quote built around two hundred guests and a quote built around three hundred are different in almost every line, and the earlier you have a real number, the fewer surprises later.",
      { h: "Two months before: the bookings that take the longest to arrange" },
      "By now the date, venue and rough numbers should be settled. This is the window for the vendors who need the most lead time, either because they are in high demand or because their work itself takes weeks, not days.",
      { list: [
        "Book the caterer and taste the menu, adjusting the final headcount once the guest list has firmed up",
        "Book an MC who speaks the languages both families actually use at home, not just the official ones — this is one detail that guests notice immediately if it is missed",
        "Order outfits early. Tailors are at their busiest in the holiday season, and a gomesi or kanzu made to measure can take several fittings to get right",
      ] },
      { h: "One month before: filling in around the big bookings" },
      "The large, expensive categories should be confirmed by now. This stage is for the parts that finish the picture: sound, images, and the small ceremonial items that are easy to forget until someone asks about them.",
      { list: [
        "Confirm sound, photography and any dancers or band, and walk through the run of speeches with the MC so the sound system knows when to expect each one",
        "Order the cake and the gifts, leaving enough time for a tasting and for any last changes to the design",
        "Share the plan with relatives who are contributing money, so everyone can see what their contribution is covering rather than relying on word of mouth",
      ] },
      { h: "The week of the event: mostly phone calls, not new bookings" },
      "If the earlier stages went well, this week should hold very few surprises. Treat it as a confirmation pass rather than a chance to add anything new — new additions this late tend to be the ones that go wrong.",
      { list: [
        "Confirm arrival times with every vendor, including the small ones like the MC and the decorators, not only the caterer",
        "Pay any balances that are due before the day, so no vendor is chasing payment on the morning itself",
        "Keep your receipts and booking numbers on your phone, somewhere you can find them quickly if a vendor arrives and anyone needs to check the booking",
      ] },
      "On Celebrate, vendors confirm within 24 hours of a booking rather than leaving you to wonder, and every booking, payment and appointment for the day sits in one place, so the week-of checklist above is mostly a matter of reading one screen rather than searching through old text messages.",
    ],
  },
  {
    slug: "how-many-tents-and-chairs",
    title: "How many tents, chairs and plates do you need?",
    description: "A practical guide to sizing tents, seats, drinks and catering for the number of guests you actually expect, with the small adjustments that experienced hosts build in and first-timers usually miss.",
    date: "2026-10-09",
    author: "Celebrate team",
    tag: "Guides",
    photo: "royal-marquee-200",
    body: [
      "Sizing an outdoor event looks like simple arithmetic once you know how vendors count, and it mostly is. Where people go wrong is not the maths itself, but forgetting the handful of guests and seats that never make it onto the official list.",
      { h: "Tents and seats" },
      "Tents are usually sold by the number of seats they cover, for example a 50-seater or a 100-seater, so start by dividing your guest count by the tent's seating number and rounding up rather than down. A 230-guest event does not fit neatly into two 100-seaters and a 50-seater; it needs the 50-seater plus some spare capacity, because the next adjustment below will eat into it.",
      "Leave room for a high table, the MC's position and the sound system, which between them often take up the equivalent of ten to fifteen seats of space even though nobody sits in them. Many families also underestimate how many guests arrive without having confirmed, particularly on the groom's or bride's extended side — building in a small buffer of five to ten per cent of your tent capacity saves an awkward conversation about folding chairs at the back.",
      { h: "Food" },
      "Caterers charge per plate, and the number that matters is not your invitation list but your expected headcount, which is almost always a little higher. Plan for every invited guest plus five to ten per cent for vendors on site, helpers, drivers who came with guests, and the handful of people who simply show up because they heard about the party. If children are coming in any number, ask the caterer whether there is a child's portion price — it is common, and it can meaningfully change the total if a quarter of your guest list is under twelve.",
      { h: "Drinks" },
      "Drinks are also priced per guest, and a long day changes the maths. Assume more than one drink per guest over an afternoon and evening event, not one drink per guest for the whole day, and make sure there is water available for everyone regardless of what else is on offer — it is the one drink nobody budgets for and everybody needs, especially outdoors under a tent at midday.",
      { h: "Let the plan do the counting" },
      "All of this is the kind of arithmetic that is easy to get right in principle and easy to get wrong under pressure, three days before the event, when the guest count has just changed again. On Celebrate, entering your guest numbers updates every quote automatically: tents, plates and drinks recalculate for your actual crowd, and the grand total updates with them, so the sizing above happens once, correctly, instead of being redone by hand every time a relative adds a name to the list.",
    ],
  },
  {
    slug: "choosing-vendors-you-can-trust",
    title: "Choosing vendors you can trust",
    description: "A tent vendor once left me and sixty guests standing in the sun with no explanation. Here is exactly what I check now, before any deposit leaves my hands.",
    date: "2026-09-22",
    author: "Daniel Okello, hosted his daughter's graduation party in Gulu",
    tag: "Guides",
    kind: "story",
    photo: "photo-full-day",
    body: [
      "Three years ago I paid a tent hire company in full, two weeks ahead, for my daughter's graduation party. On the morning of the event I called to confirm the delivery time and the number rang out. It rang out again an hour later, and again after that. By midday I had sixty guests standing in direct sun in my compound while I borrowed plastic chairs from three neighbours and sent my nephew on a motorbike to the next town to find anyone who still had a tent free on a Saturday. The company never answered, never delivered, and never returned the money. I tell this story often, not because I enjoy it, but because almost everyone I know has a version of it.",
      "That afternoon changed how I book anything for my family, permanently. What follows is not a theory. It is the exact list I now go through before a single shilling leaves my hands, built from that one very hot, very long Saturday.",
      { h: "I read the reviews, but I read them for the right thing" },
      "Anyone can gather five good reviews from friends and family in an afternoon. What I look for now is volume and detail — a vendor with sixty reviews that each mention specific things, a specific wedding, a specific delay, a specific fix, tells me far more than a vendor with five reviews that all say \"great service\" in almost the same words. I am also, frankly, more reassured by a vendor with one or two honest three-star reviews describing a real but minor problem than by a vendor with a perfect record and nothing else — nobody is flawless, and a business that has clearly had one bad day and talked a customer through it is a business that answers its phone.",
      { h: "I ask what the price actually includes, out loud, before I agree to anything" },
      "The quote that destroyed my graduation party looked cheap for a reason I did not ask about at the time: it did not include delivery, setup or take-down, which the company apparently expected me to arrange myself, and which I only discovered when nobody arrived to do it. Now I ask directly, every time: does this price include labour, delivery and transport, or are those extra? A vendor who can answer that in one sentence, without hesitating, is a vendor who has done this enough times to know their own numbers. A vendor who has to \"check and get back to you\" on their own pricing is telling you something, and it usually is not good news.",
      { h: "I want the cancellation terms before the good day, not during the bad one" },
      "Nobody wants to discuss what happens if things go wrong while everyone is still excited about the booking. I ask anyway, because the only time that question actually matters is the one time you need the answer, and by then it is too late to negotiate it. I want to know, in writing if at all possible, what happens if the vendor cancels on me, what happens if I need to cancel, and whether a deposit is refundable and under what conditions. If a vendor is cagey about putting any of this in writing, I treat that as the answer.",
      { h: "I keep everything in one place where I can actually find it" },
      "On the day of my daughter's graduation, I was trying to find a phone number scribbled on the back of an old receipt while also trying to keep sixty guests calm in the sun. I never want to be in that position again. These days every booking I make, every message I send a vendor, and every payment I make sits in one record on Celebrate rather than scattered across text messages, a notebook and a half-remembered phone call. When a vendor is late, or not answering, I am not searching for evidence — it is already there, timestamped, and so is the fact that my deposit is held until the vendor actually accepts the booking, not released to them on faith the moment I pay it.",
      { h: "What I tell my friends now" },
      "I am not telling anyone to distrust every vendor — most of the ones I have booked since that Saturday have been excellent, on time, and exactly as described. What I am telling people is to check the same four things every time, however good the recommendation sounds: real, detailed reviews; a price that says plainly what it includes; cancellation terms you have seen before you pay, not after something goes wrong; and a record of the whole booking that you can put your hands on quickly if you need to. It takes perhaps ten extra minutes per vendor. It is ten minutes I would have given almost anything to have spent, three years ago, before that phone rang out for the first time.",
    ],
  },
];

const WORDS_PER_MINUTE = 200;

const wordsIn = (post) => {
  const bodyText = post.body.map((block) => (typeof block === "string" ? block : block.h ? block.h : block.list ? block.list.join(" ") : "")).join(" ");
  return `${post.title} ${post.description} ${bodyText}`.trim().split(/\s+/).filter(Boolean).length;
};

/** A rough "X min read", from the post's word count. Always at least one minute. */
export const readMinutes = (post) => Math.max(1, Math.round(wordsIn(post) / WORDS_PER_MINUTE));

export const postBySlug = (slug) => POSTS.find((post) => post.slug === slug);
export const sortedPosts = () => [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
