import type { HomePageContent } from "@/lib/home/types";

export const DISCORD_INVITE_URL = "https://discord.gg/WMQNyrkZcq";

export const DEFAULT_HOME_PAGE_CONTENT: HomePageContent = {
  hero: {
    motto: "Humans are born to survive, ODSTs are built to dive",
    lead:
      "We are Zeta Company — we adapt to survive in hostile territory, dropping in behind enemy lines, taking out HVTs, rescuing VIPs, causing havoc to the enemy, and retaking vital sites from our foes.",
  },
  slideshowImages: [
    { src: "/zeta1.webp", alt: "Zeta Company operation" },
    { src: "/zeta2.webp", alt: "Zeta Company deployment" },
    { src: "/zeta3.webp", alt: "Zeta Company in the field" },
  ],
  sections: [
    {
      id: "about",
      title: "Introduction",
      paragraphs: [
        "We serve under the Cole Protocol, making sure that the Covenant doesn't find its way back to Earth by any means necessary.",
      ],
    },
    {
      id: "community",
      title: "Community",
      paragraphs: [
        "Outside of operations, we are striving to create a friendly community that works together with the larger Optre community to bring you an enjoyable experience with our in-depth campaigns to take your minds off the real world.",
        "Zeta is led by passionate Halo fans with experienced Arma players leading our groups. We are a semi-serious unit that hopes to find a good balance between the lore of Halo and the general Arma experience.",
      ],
    },
    {
      id: "unit-information",
      title: "Unit Information",
      subtitle: "How we function",
      paragraphs: [
        "We are split into 3 departments: our Zeus team, our aviation department, and finally our ODSTs.",
      ],
      departments: [
        {
          name: "Watcher",
          role: "Command",
          description:
            "Your command element building our weekly ops, providing the experience for you.",
        },
        {
          name: "Raptor",
          role: "Aviation",
          description:
            "Our air department responsible for getting you from point A to B when pods are out of the question amongst other duties.",
        },
        {
          name: "Grizzly",
          role: "ODST",
          description:
            "The workhorse of the unit, dropping into hell, getting the objectives done and returning home.",
        },
      ],
    },
    {
      id: "what-we-offer",
      title: "What Do We Offer",
      bullets: [
        "A good experience every Thursday at 7pm GMT / 2pm EST",
        "Friendly staff to provide you with a comfortable time",
        "A good community to get the job done with",
      ],
    },
    {
      id: "how-to-join",
      title: "How Do You Join Us",
      bullets: [
        "As long as you're over 16",
        "Have a working mic and legally own Arma 3",
        "Head down to our Discord using the link below and either request to speak to a recruiter or fill in the cadet form to get started",
        "Get yourself trained or, if you are able, attend a trial by fire",
      ],
      showDiscordCta: true,
    },
  ],
};
