/**
 * The people behind Celebrate, shown on /team and on the home and about pages (four of them).
 *
 * To add or change a photo, put a portrait in site/public/team/ (about 720 × 900 pixels, JPG)
 * and set `photo` to its path. Until then `photo` is that card's "Photo coming soon" picture,
 * /team/member-<number>.svg, each tinted to match its card.
 * `bio` is optional: one or two short sentences shown on /team.
 * A line still reading "Team member name" is a placeholder for someone whose details we do not have yet.
 */
const soon = (number) => `/team/member-${number}.svg`;

export const TEAM = [
  { name: "Ogwal Steve", role: "CEO", photo: soon(1) },
  { name: "Martha Praise Katusiime", role: "Software Engineer (Front End)", photo: "/team/martha-praise-katusiime.jpg" },
  { name: "Mukasa Matthew", role: "Software Engineer (Back End)", photo: "/team/mukasa-matthew.jpg" },
  { name: "Shalom Lilly Sirabo", role: "UI/UX Designer", photo: "/team/shalom-lilly-sirabo.jpg" },
  { name: "Mwiza Dorothy", role: "Governance and Data Privacy Reporting", photo: "/team/mwiza-dorothy.jpg" },
  { name: "Mugabi Marion", role: "Governance, Policy Rules and Report Making", photo: "/team/mugabi-marion.jpg" },
  { name: "Ochen Deo Lino", role: "Customer Journey and Business Analysis", photo: "/team/ochen-deo-lino.jpg" },
  { name: "Tumwine Timothy", role: "Marketing Lead", photo: "/team/tumwine-timothy.jpg" },
  { name: "Mutoni Denise", role: "Marketing Communications Designer", photo: soon(9) },
  { name: "Team member name", role: "Role to be announced", photo: soon(10) },
];

/** True while a card still shows a "Photo coming soon" picture. */
export const hasPhoto = (person) => !/^\/team\/member-\d+\.svg$/.test(person.photo);

/** Four people for the home and about pages: those with a real photo first, in team order. */
export const featuredTeam = () => [...TEAM.filter(hasPhoto), ...TEAM.filter((p) => !hasPhoto(p))].slice(0, 4);
