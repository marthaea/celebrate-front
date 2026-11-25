/**
 * The people behind Celebrate, shown on /team and on the home and about pages (four of them).
 *
 *

 */
const soon = (number) => `/team/member-${number}.svg`;

export const TEAM = [
  { name: "Ogwal Steve", role: "CEO", photo: "/team/ogwal-steve.jpg" },
  { name: "Martha Praise Katusiime", role: "Software Engineer (Front End)", photo: "/team/martha-praise-katusiime.jpg" },
  { name: "Mukasa Matthew", role: "Software Engineer (Back End)", photo: "/team/mukasa-matthew.jpg" },
  { name: "Shalom Lilly Sirabo", role: "UI/UX Designer", photo: "/team/shalom-lilly-sirabo.jpg" },
  { name: "Mwiza Dorothy", role: "Governance and Data Privacy Reporting", photo: "/team/mwiza-dorothy.jpg" },
  { name: "Amumpaire Marion", role: "Governance, Policy Rules and Report Making", photo: "/team/mugabi-marion.jpg" },
  { name: "Ochen Deo Lino", role: "Customer Journey and Business Analysis", photo: "/team/ochen-deo-lino.jpg" },
  { name: "Tumwine Timothy", role: "Marketing Lead", photo: "/team/tumwine-timothy.jpg" },
  { name: "Mutoni Denise", role: "Marketing Communications Designer", photo: "/team/mutoni-denise.jpg" },
  { name: "Asia Marvin", role: "Brand Strategist", photo: "/team/asia-marvin.jpg" },
];

/** True while a card still shows a "Photo coming soon" picture. */
export const hasPhoto = (person) => !/^\/team\/member-\d+\.svg$/.test(person.photo);

/** Four people for the home and about pages: those with a real photo first, in team order. */
export const featuredTeam = () => [...TEAM.filter(hasPhoto), ...TEAM.filter((p) => !hasPhoto(p))].slice(0, 4);
