// ── meetups.js — Meetup category links to live Calgary sources ────────────────
// No API available for meetups (Meetup.com requires a paid Pro subscription
// just to apply for API access). Instead: curated category link cards to
// real, live search/group pages that stay current without any maintenance.

export const MEETUP_CATEGORIES = [
  {
    id: 'career',
    label: 'Career & Networking',
    icon: 'briefcase',
    color: '#1E40AF',
    bg: '#EFF6FF',
    sources: [
      { name: 'Eventbrite — Calgary Networking', url: 'https://www.eventbrite.ca/d/canada--calgary/networking/', desc: 'Business mixers, entrepreneur events, career nights' },
      { name: 'Meetup — Professional Networking', url: 'https://www.meetup.com/find/ca--calgary/professional-networking/', desc: 'Ongoing professional groups across Calgary' },
      { name: 'Eventbrite — Calgary Newcomers', url: 'https://www.eventbrite.ca/d/canada--calgary/calgary-newcomers/', desc: 'Newcomer-specific career and settlement events' },
    ],
  },
  {
    id: 'culture',
    label: 'Culture & Food',
    icon: 'utensils',
    color: '#9A3412',
    bg: '#FFF7ED',
    sources: [
      { name: 'Eventbrite — Calgary Food & Drink', url: 'https://www.eventbrite.ca/d/canada--calgary/food-and-drink--events/', desc: 'Food festivals, tastings, cultural dinners' },
      { name: 'Meetup — Calgary Culture & Food', url: 'https://www.meetup.com/find/ca--calgary/food-drink/', desc: 'Ongoing cultural and culinary groups' },
      { name: 'Calgary Catholic Immigration Society Events', url: 'https://ccisab.ca', desc: 'Multicultural community events and celebrations' },
    ],
  },
  {
    id: 'sports',
    label: 'Sports & Fitness',
    icon: 'activity',
    color: '#065F46',
    bg: '#ECFDF5',
    sources: [
      { name: 'Calgary Sport & Social Club', url: 'https://www.calgarysportsclub.com/', desc: '15+ co-ed sports leagues, drop-ins, no membership fees' },
      { name: 'City of Calgary — Sport Hub', url: 'https://www.calgary.ca/parks-rec-programs/sports.html', desc: 'Free & low-cost lessons, drop-in games, open gym' },
      { name: 'Meetup — Calgary Sports', url: 'https://www.meetup.com/topics/sports/ca/ab/calgary/', desc: 'Pickup games, fitness groups, outdoor activities' },
    ],
  },
  {
    id: 'language',
    label: 'Language Exchange',
    icon: 'globe',
    color: '#3730A3',
    bg: '#E0E7FF',
    sources: [
      { name: 'Meetup — Calgary Language Exchange', url: 'https://www.meetup.com/find/ca--calgary/language-exchange/', desc: 'Practice English or other languages with locals' },
      { name: 'Bow Valley College — LINC Classes', url: 'https://bowvalleycollege.ca', desc: 'Free government-funded English classes' },
      { name: 'Centre for Newcomers — Language Programs', url: 'https://centrefornewcomers.ca', desc: 'Conversation circles and LINC levels 1-7' },
    ],
  },
  {
    id: 'students',
    label: 'Students',
    icon: 'graduation',
    color: '#B45309',
    bg: '#FEF3C7',
    sources: [
      { name: 'Eventbrite — Calgary Student Events', url: 'https://www.eventbrite.ca/d/canada--calgary/students/', desc: 'Campus events, student mixers across Calgary' },
      { name: 'University of Calgary — International Student Services', url: 'https://www.ucalgary.ca/student-services/student-success/international', desc: 'Clubs, orientation events, peer support' },
      { name: 'SAIT — International Student Events', url: 'https://www.sait.ca/student-life/international-student-services', desc: 'Settlement workshops and social events' },
    ],
  },
  {
    id: 'family',
    label: 'Parents & Families',
    icon: 'home',
    color: '#9D174D',
    bg: '#FCE7F3',
    sources: [
      { name: 'City of Calgary — Family Events', url: 'https://www.calgary.ca/things-to-do/events.html', desc: 'Free city-run family programming and festivals' },
      { name: 'Eventbrite — Calgary Family Events', url: 'https://www.eventbrite.ca/d/canada--calgary/family/', desc: 'Kid-friendly meetups, playgroups, family days' },
      { name: 'Calgary Public Library — Family Programs', url: 'https://calgarylibrary.ca', desc: 'Free storytimes, family drop-ins at every branch' },
    ],
  },
  {
    id: 'outdoors',
    label: 'Outdoors & Hiking',
    icon: 'mountain',
    color: '#0369A1',
    bg: '#F0F9FF',
    sources: [
      { name: 'Meetup — Calgary Hiking', url: 'https://www.meetup.com/topics/hiking/ca/ab/calgary/', desc: 'Group hikes around Calgary and the Rockies' },
      { name: 'Calgary Outdoor Council', url: 'https://www.calgaryoutdoorcouncil.org', desc: 'Outdoor recreation clubs and trip listings' },
      { name: 'City of Calgary — Pathways & Parks', url: 'https://www.calgary.ca/parks.html', desc: 'Self-guided trail maps and park event listings' },
    ],
  },
];

export function categoryIconSVG(name, size = 16, color = 'currentColor') {
  const icons = {
    briefcase:  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>`,
    utensils:   `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg>`,
    activity:   `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    globe:      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
    graduation: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
    home:       `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    mountain:   `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M8 21l4-7 4 7"/><path d="M3 21l6-12 4 6 2-3 6 9"/></svg>`,
  };
  return icons[name] || icons.globe;
}
