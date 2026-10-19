import { MissionCampaign } from "./missionStories";

export interface ComicStory {
  id: string;
  title: string;
  blurb: string;
  art: MissionCampaign["art"];
  reference: string;
  chapters: MissionCampaign[];
}

export const COMIC_STORIES: ComicStory[] = [
  {
    id: "jonah",
    title: "Jonah and the Great Fish",
    blurb: "A prophet runs from God — and learns you cannot outrun mercy.",
    art: "jonah",
    reference: "Jonah 1 - 4",
    chapters: [
      {
        id: "jonah-1",
        character: "Jonah",
        title: "Chapter 1: The Runaway Prophet",
        blurb: "God calls Jonah to Nineveh. Jonah buys a ticket the other way.",
        art: "jonah",
        difficulty: "easy",
        reference: "Jonah 1",
        startNode: "call",
        nodes: [
          {
            id: "call",
            reference: "Jonah 1:1-3",
            panels: [
              { speaker: "narrator", text: "The word of the Lord comes to Jonah son of Amittai." },
              { speaker: "voice", name: "The Lord", text: "Arise, go to Nineveh, that great city, and cry out against it; for their wickedness has come up before Me." },
              { speaker: "character", name: "Jonah", text: "Nineveh? Those people are cruel. If I warn them, they might repent — and God might forgive them." },
            ],
            prompt: "What does Jonah do?",
            choices: [
              { text: "Go to Nineveh at once, as God commanded", next: "obey", xp: 20, outcome: "good" },
              { text: "Board a ship to Tarshish, as far from Nineveh as possible", next: "ship", outcome: "bad" },
            ],
          },
          {
            id: "obey",
            reference: "Jonah 3:3",
            panels: [
              { speaker: "narrator", text: "In this telling, Jonah obeys the first time. The real Jonah did not — and the sea itself rose up against him." },
              { speaker: "character", name: "Jonah", text: "It is better to obey the first time. But let me show you what really happened..." },
            ],
            choices: [{ text: "See what really happened", next: "ship", xp: 10 }],
          },
          {
            id: "ship",
            reference: "Jonah 1:4-12",
            panels: [
              { speaker: "narrator", text: "Jonah boards a ship to Tarshish and falls asleep below deck. Then the Lord hurls a great wind upon the sea." },
              { speaker: "character", name: "Captain", text: "Sleeper, arise! Call on your God! The lots have fallen on you — who are you, and what have you done?" },
              { speaker: "character", name: "Jonah", text: "I am a Hebrew, and I fear the Lord, the God of heaven, who made the sea and the dry land. This storm is my fault." },
            ],
            prompt: "How should Jonah answer the storm?",
            choices: [
              { text: "\"Throw me into the sea, and it will become calm\"", next: "sea", xp: 20, outcome: "good" },
              { text: "\"Row harder! We can outrun this storm\"", next: "row", outcome: "bad" },
            ],
          },
          {
            id: "row",
            reference: "Jonah 1:13",
            panels: [
              { speaker: "narrator", text: "The sailors row with all their strength, but the sea grows wilder. You cannot row away from a call of God." },
              { speaker: "character", name: "Jonah", text: "Enough. It is me the storm is after. Throw me into the sea." },
            ],
            choices: [{ text: "Into the sea", next: "sea", xp: 10 }],
          },
          {
            id: "sea",
            reference: "Jonah 1:15-17",
            panels: [
              { speaker: "narrator", text: "The sailors cry out to the Lord and hurl Jonah overboard. At once, the sea ceases from its raging." },
              { speaker: "narrator", text: "And the Lord prepares a great fish to swallow Jonah. He is in the belly of the fish three days and three nights." },
              { speaker: "character", name: "Jonah", text: "It is dark. It is cold. And for the first time since I ran... I am finally still enough to pray." },
            ],
            ending: "victory",
          },
        ],
      },
      {
        id: "jonah-2",
        character: "Jonah",
        title: "Chapter 2: The Prayer from the Deep",
        blurb: "Inside the fish, Jonah finally prays — and God gives a second chance.",
        art: "jonah",
        difficulty: "easy",
        reference: "Jonah 2",
        startNode: "prayer",
        nodes: [
          {
            id: "prayer",
            reference: "Jonah 2:1-6",
            panels: [
              { speaker: "narrator", text: "Three days in darkness. Seaweed wrapped around his head. Jonah prays to the Lord his God from the fish's belly." },
              { speaker: "character", name: "Jonah", text: "I cried out to the Lord in my distress, and He answered me. Out of the belly of Sheol I cried, and You heard my voice." },
            ],
            prompt: "How does Jonah's prayer end?",
            choices: [
              { text: "\"Salvation is of the Lord!\" — with thanksgiving and surrender", next: "surrender", xp: 20, outcome: "good" },
              { text: "\"Get me out of here, but I still won't go to Nineveh\"", next: "stubborn", outcome: "bad" },
            ],
          },
          {
            id: "stubborn",
            reference: "Jonah 2:9",
            panels: [
              { speaker: "narrator", text: "Jonah's heart is still hard. But grace does not wait for us to be ready — it works on us while we sit in the dark." },
              { speaker: "character", name: "Jonah", text: "...No. I have run far enough. What I have vowed, I will pay. Salvation is of the Lord." },
            ],
            choices: [{ text: "Surrender fully", next: "surrender", xp: 10 }],
          },
          {
            id: "surrender",
            reference: "Jonah 2:10 - 3:1",
            panels: [
              { speaker: "narrator", text: "The Lord speaks to the fish, and it vomits Jonah onto dry land." },
              { speaker: "voice", name: "The Lord", text: "Arise, go to Nineveh, that great city, and preach to it the message that I tell you." },
              { speaker: "character", name: "Jonah", text: "The same command. The same God. This time... I go." },
            ],
            prompt: "The second chance is given. What now?",
            choices: [
              { text: "Rise and go to Nineveh", next: "go", xp: 20, outcome: "good" },
              { text: "Rest first — the fish ride was exhausting", next: "rest", outcome: "bad" },
            ],
          },
          {
            id: "rest",
            reference: "Jonah 3:2-3",
            panels: [
              { speaker: "narrator", text: "The call of God does not expire while we rest. Nineveh is still waiting, and every delayed day is a day of mercy wasted." },
              { speaker: "character", name: "Jonah", text: "No more delays. I have been given back my life — I will spend it obeying." },
            ],
            choices: [{ text: "Go to Nineveh", next: "go", xp: 10 }],
          },
          {
            id: "go",
            reference: "Jonah 3:3-4",
            panels: [
              { speaker: "narrator", text: "Nineveh is a city so great it takes three days to cross. Jonah walks in and begins to preach." },
              { speaker: "character", name: "Jonah", text: "Yet forty days, and Nineveh shall be overthrown!" },
            ],
            ending: "victory",
          },
        ],
      },
      {
        id: "jonah-3",
        character: "Jonah",
        title: "Chapter 3: The City That Repented",
        blurb: "Nineveh repents, God forgives — and Jonah must learn God's heart.",
        art: "jonah",
        difficulty: "medium",
        reference: "Jonah 3 - 4",
        startNode: "repent",
        nodes: [
          {
            id: "repent",
            reference: "Jonah 3:5-10",
            panels: [
              { speaker: "narrator", text: "The people of Nineveh believe God. From the greatest to the least, they put on sackcloth and fast. Even the king steps down from his throne." },
              { speaker: "narrator", text: "God sees their works, that they turn from their evil way — and God relents from the disaster He said He would bring." },
              { speaker: "character", name: "Jonah", text: "This is exactly why I ran! I knew You would forgive them!" },
            ],
            prompt: "How should Jonah respond to Nineveh's mercy?",
            choices: [
              { text: "Rejoice that 120,000 souls were spared", next: "rejoice", xp: 20, outcome: "good" },
              { text: "Sit outside the city, angry, hoping it is still destroyed", next: "angry", outcome: "bad" },
            ],
          },
          {
            id: "angry",
            reference: "Jonah 4:1-4",
            panels: [
              { speaker: "character", name: "Jonah", text: "O Lord, take my life from me! It is better for me to die than to live!" },
              { speaker: "voice", name: "The Lord", text: "Is it right for you to be angry?" },
            ],
            choices: [{ text: "Hear God's answer", next: "plant", xp: 5 }],
          },
          {
            id: "plant",
            reference: "Jonah 4:6-11",
            panels: [
              { speaker: "narrator", text: "God prepares a plant to shade Jonah — then a worm to wither it, and a scorching east wind. Jonah grieves more for the plant than for the city." },
              { speaker: "voice", name: "The Lord", text: "You had pity on the plant, for which you did not labor. Should I not pity Nineveh, that great city, with more than 120,000 persons who do not know their right hand from their left?" },
            ],
            choices: [{ text: "Understand God's heart", next: "rejoice", xp: 10 }],
          },
          {
            id: "rejoice",
            reference: "Jonah 4:11",
            panels: [
              { speaker: "narrator", text: "The book ends with God's question hanging in the air. Jonah's story is really about God's mercy — for Nineveh, and for the runaway prophet himself." },
              { speaker: "character", name: "Jonah", text: "You are a gracious God, merciful, slow to anger and abundant in lovingkindness. Even for people like me." },
            ],
            ending: "victory",
          },
        ],
      },
    ],
  },
  {
    id: "daniel",
    title: "Daniel in the Lions' Den",
    blurb: "One man's daily habit of prayer outlasts a king's decree and a den of lions.",
    art: "daniel",
    reference: "Daniel 6",
    chapters: [
      {
        id: "daniel-1",
        character: "Daniel",
        title: "Chapter 1: The Trap",
        blurb: "Jealous officials discover the only way to accuse Daniel — his faith.",
        art: "daniel",
        difficulty: "easy",
        reference: "Daniel 6:1-9",
        startNode: "plot",
        nodes: [
          {
            id: "plot",
            reference: "Daniel 6:3-5",
            panels: [
              { speaker: "narrator", text: "Daniel excels above all the governors of King Darius's kingdom. The other officials search for a charge against him — and find nothing." },
              { speaker: "character", name: "Official", text: "We shall never find any charge against this Daniel unless we find it against him concerning the law of his God." },
              { speaker: "character", name: "Daniel", text: "They are plotting something. Let them come." },
            ],
            prompt: "The officials draft a law: for thirty days, no one may pray to any god or man except the king. What does Daniel do?",
            choices: [
              { text: "Keep praying openly, three times a day, as was his custom", next: "pray", xp: 20, outcome: "good" },
              { text: "Pray in secret for thirty days — wisdom over boldness", next: "secret", outcome: "bad" },
            ],
          },
          {
            id: "secret",
            reference: "Daniel 6:10",
            panels: [
              { speaker: "narrator", text: "Daniel considers hiding. But his window toward Jerusalem has been open for decades — through exile, through three kings. Why close it now?" },
              { speaker: "character", name: "Daniel", text: "My prayer life is not a thirty-day decision. It is my life. The window stays open." },
            ],
            choices: [{ text: "Open the window and pray", next: "pray", xp: 10 }],
          },
          {
            id: "pray",
            reference: "Daniel 6:10-13",
            panels: [
              { speaker: "narrator", text: "Daniel goes home, opens his windows toward Jerusalem, kneels and prays three times that day — as was his custom since early days." },
              { speaker: "character", name: "Official", text: "O king! Daniel, one of the exiles from Judah, pays no attention to you or your decree. He prays three times a day!" },
            ],
            ending: "victory",
          },
        ],
      },
      {
        id: "daniel-2",
        character: "Daniel",
        title: "Chapter 2: The King's Regret",
        blurb: "Trapped by his own law, the king must throw his best man to the lions.",
        art: "daniel",
        difficulty: "easy",
        reference: "Daniel 6:14-17",
        startNode: "king",
        nodes: [
          {
            id: "king",
            reference: "Daniel 6:14-15",
            panels: [
              { speaker: "narrator", text: "The king is deeply distressed. He labors until sundown to rescue Daniel, but the law of the Medes and Persians cannot be changed." },
              { speaker: "character", name: "King Darius", text: "My own decree! My own pride! The best man in my kingdom, and I signed his death warrant." },
            ],
            prompt: "What does the king say as Daniel is thrown in?",
            choices: [
              { text: "\"Your God, whom you serve continually, He will deliver you\"", next: "den", xp: 20, outcome: "good" },
              { text: "\"I am sorry, Daniel. There is nothing anyone can do\"", next: "hopeless", outcome: "bad" },
            ],
          },
          {
            id: "hopeless",
            reference: "Daniel 6:16",
            panels: [
              { speaker: "narrator", text: "The king's despair is real — but even a pagan king has watched Daniel's God work for years. Faith is catching." },
              { speaker: "character", name: "King Darius", text: "Wait... Your God, whom you serve continually — He will deliver you." },
            ],
            choices: [{ text: "To the den", next: "den", xp: 10 }],
          },
          {
            id: "den",
            reference: "Daniel 6:16-17",
            panels: [
              { speaker: "narrator", text: "A stone is laid on the mouth of the den, and the king seals it with his own signet ring. The king spends the night fasting, and sleep flees from him." },
              { speaker: "character", name: "Daniel", text: "It is quiet down here. Just me, the lions... and my God." },
            ],
            ending: "victory",
          },
        ],
      },
      {
        id: "daniel-3",
        character: "Daniel",
        title: "Chapter 3: The Morning After",
        blurb: "At dawn, the king runs to the den — and hears a voice from inside.",
        art: "daniel",
        difficulty: "easy",
        reference: "Daniel 6:19-28",
        startNode: "dawn",
        nodes: [
          {
            id: "dawn",
            reference: "Daniel 6:19-20",
            panels: [
              { speaker: "narrator", text: "Very early in the morning, the king hurries to the lions' den and cries out with a trembling voice." },
              { speaker: "character", name: "King Darius", text: "Daniel, servant of the living God! Has your God, whom you serve continually, been able to deliver you from the lions?" },
            ],
            prompt: "Silence. Then — what answers from the den?",
            choices: [
              { text: "\"O king, live forever! My God sent His angel and shut the lions' mouths\"", next: "alive", xp: 20, outcome: "good" },
              { text: "Only the growling of lions", next: "silence", outcome: "bad" },
            ],
          },
          {
            id: "silence",
            reference: "Daniel 6:21-22",
            panels: [
              { speaker: "narrator", text: "For a heartbeat, there is no answer. The king's face falls. Then, clear and calm, a voice rises from the dark..." },
              { speaker: "character", name: "Daniel", text: "O king, live forever! My God sent His angel and shut the lions' mouths, so they have not hurt me." },
            ],
            choices: [{ text: "Lift Daniel out", next: "alive", xp: 10 }],
          },
          {
            id: "alive",
            reference: "Daniel 6:23-28",
            panels: [
              { speaker: "narrator", text: "Daniel is lifted from the den, and no wound is found on him — because he believed in his God." },
              { speaker: "character", name: "King Darius", text: "I make a decree: in every dominion of my kingdom, men must tremble and fear before the God of Daniel. For He is the living God!" },
              { speaker: "narrator", text: "So Daniel prospers in the reign of Darius and in the reign of Cyrus the Persian." },
            ],
            ending: "victory",
          },
        ],
      },
    ],
  },
  {
    id: "prodigal",
    title: "The Prodigal Son",
    blurb: "Jesus' story of a son who ran, a father who waited, and a love that ran to meet him.",
    art: "prodigal",
    reference: "Luke 15:11-32",
    chapters: [
      {
        id: "prodigal-1",
        character: "The Younger Son",
        title: "Chapter 1: The Far Country",
        blurb: "A son demands his inheritance early and leaves home.",
        art: "prodigal",
        difficulty: "easy",
        reference: "Luke 15:11-16",
        startNode: "demand",
        nodes: [
          {
            id: "demand",
            reference: "Luke 15:11-13",
            panels: [
              { speaker: "narrator", text: "Jesus tells a story. A man has two sons. The younger one comes to his father with an unthinkable request." },
              { speaker: "character", name: "Younger Son", text: "Father, give me the share of property that falls to me." },
              { speaker: "narrator", text: "He is asking for his inheritance while his father still lives — as good as saying, 'I wish you were dead.'" },
            ],
            prompt: "You are the younger son. What drives you?",
            choices: [
              { text: "Freedom — I want to live my own life, far from rules", next: "far", xp: 10, outcome: "bad" },
              { text: "Actually... maybe I should stay and honor my father", next: "stay", outcome: "good" },
            ],
          },
          {
            id: "stay",
            reference: "Luke 15:12-13",
            panels: [
              { speaker: "narrator", text: "In this telling, the son stays. But Jesus told it the other way — because we all leave, one way or another." },
              { speaker: "character", name: "Younger Son", text: "No. The far country is calling. Let me show you how it really went..." },
            ],
            choices: [{ text: "Go to the far country", next: "far", xp: 5 }],
          },
          {
            id: "far",
            reference: "Luke 15:13-16",
            panels: [
              { speaker: "narrator", text: "He gathers all he has and journeys to a far country. There he squanders everything in reckless living." },
              { speaker: "narrator", text: "Then a severe famine strikes. He hires himself out to feed pigs — and longs to eat the pods the pigs eat. No one gives him anything." },
              { speaker: "character", name: "Younger Son", text: "How many of my father's hired servants have more than enough bread, but I perish here with hunger!" },
            ],
            prompt: "Rock bottom. What now?",
            choices: [
              { text: "\"I will arise and go to my father\"", next: "arise", xp: 20, outcome: "good" },
              { text: "I can't go back. I've burned that bridge forever", next: "despair", outcome: "bad" },
            ],
          },
          {
            id: "despair",
            reference: "Luke 15:17-19",
            panels: [
              { speaker: "narrator", text: "Despair whispers that home is closed. But then — Jesus says — the son 'came to himself.'" },
              { speaker: "character", name: "Younger Son", text: "What am I doing? Even my father's servants eat bread. I will arise and go to my father." },
            ],
            choices: [{ text: "Arise and go", next: "arise", xp: 10 }],
          },
          {
            id: "arise",
            reference: "Luke 15:18-19",
            panels: [
              { speaker: "character", name: "Younger Son", text: "Father, I have sinned against heaven and before you. I am no longer worthy to be called your son. Treat me as one of your hired servants." },
              { speaker: "narrator", text: "He rehearses the speech the whole long walk home. He has no idea what is waiting at the end of the road." },
            ],
            ending: "victory",
          },
        ],
      },
      {
        id: "prodigal-2",
        character: "The Father",
        title: "Chapter 2: The Father Who Ran",
        blurb: "While the son is still far off, the father sees him — and runs.",
        art: "prodigal",
        difficulty: "easy",
        reference: "Luke 15:20-24",
        startNode: "road",
        nodes: [
          {
            id: "road",
            reference: "Luke 15:20",
            panels: [
              { speaker: "narrator", text: "While the son is still a long way off, his father sees him. Every day, that father has watched the road." },
              { speaker: "narrator", text: "The father is filled with compassion. He runs — an old man, robes flying, dignity forgotten — and falls on his son's neck and kisses him." },
            ],
            prompt: "The son begins his rehearsed speech: 'Father, I have sinned... I am no longer worthy to be called your son.' What does the father do?",
            choices: [
              { text: "Cut him off mid-speech: \"Bring the best robe! The ring! Sandals! Kill the fattened calf!\"", next: "feast", xp: 20, outcome: "good" },
              { text: "Let him finish, then accept him back — as a servant, as agreed", next: "servant", outcome: "bad" },
            ],
          },
          {
            id: "servant",
            reference: "Luke 15:21-22",
            panels: [
              { speaker: "narrator", text: "But that is not the father in Jesus' story. Grace does not negotiate terms of service — it restores sonship." },
              { speaker: "character", name: "Father", text: "Enough. Bring quickly the best robe and put it on him. Put a ring on his hand and shoes on his feet!" },
            ],
            choices: [{ text: "Prepare the feast", next: "feast", xp: 10 }],
          },
          {
            id: "feast",
            reference: "Luke 15:23-24",
            panels: [
              { speaker: "character", name: "Father", text: "Let us eat and celebrate! For this my son was dead, and is alive again; he was lost, and is found!" },
              { speaker: "narrator", text: "Music and dancing fill the house. But outside in the field, the elder son hears the celebration — and his heart hardens." },
            ],
            ending: "victory",
          },
        ],
      },
      {
        id: "prodigal-3",
        character: "The Elder Son",
        title: "Chapter 3: The Brother Who Stayed",
        blurb: "The elder son refuses to enter the feast — and the father comes out to him too.",
        art: "prodigal",
        difficulty: "medium",
        reference: "Luke 15:25-32",
        startNode: "field",
        nodes: [
          {
            id: "field",
            reference: "Luke 15:25-28",
            panels: [
              { speaker: "narrator", text: "The elder son comes in from the field and hears music and dancing. A servant tells him: your brother has come, and your father has killed the fattened calf." },
              { speaker: "character", name: "Elder Son", text: "All these years I have served you, and you never gave me a young goat to feast with my friends. But when this son of yours comes, who devoured your property — you kill the fattened calf for him!" },
            ],
            prompt: "You are the elder son. The father comes out and pleads with you. What do you say?",
            choices: [
              { text: "Soften: \"Father... I hear you. Let me come in\"", next: "enter", xp: 20, outcome: "good" },
              { text: "Stay outside, arms crossed: \"He doesn't deserve this\"", next: "outside", outcome: "bad" },
            ],
          },
          {
            id: "outside",
            reference: "Luke 15:31-32",
            panels: [
              { speaker: "character", name: "Father", text: "Son, you are always with me, and all that is mine is yours. But it was fitting to celebrate — for this your brother was dead, and is alive; he was lost, and is found." },
            ],
            choices: [{ text: "Let the words sink in", next: "enter", xp: 10 }],
          },
          {
            id: "enter",
            reference: "Luke 15:31-32",
            panels: [
              { speaker: "narrator", text: "Jesus never tells us whether the elder son goes in. He leaves the door open — because the story is an invitation." },
              { speaker: "character", name: "Father", text: "Everything I have is yours. It was fitting to celebrate and be glad." },
              { speaker: "narrator", text: "Two sons. One lost in a far country, one lost in his own backyard. One father, running out to meet them both." },
            ],
            ending: "victory",
          },
        ],
      },
    ],
  },
  {
    id: "moses-red-sea",
    title: "Crossing the Red Sea",
    blurb: "Trapped between Pharaoh's army and the sea, Israel watches God make a way.",
    art: "redsea",
    reference: "Exodus 14",
    chapters: [
      {
        id: "moses-1",
        character: "Moses",
        title: "Chapter 1: Trapped",
        blurb: "Pharaoh's chariots thunder toward a defenseless people camped by the sea.",
        art: "redsea",
        difficulty: "easy",
        reference: "Exodus 14:1-12",
        startNode: "camp",
        nodes: [
          {
            id: "camp",
            reference: "Exodus 14:5-9",
            panels: [
              { speaker: "narrator", text: "Israel is free — three days out of Egypt. Then Pharaoh's heart changes. Six hundred chosen chariots ride out after them." },
              { speaker: "character", name: "Israelite", text: "Moses! The Egyptians are coming! The sea is in front of us, the army behind us — we are trapped!" },
              { speaker: "character", name: "Israelite", text: "Were there no graves in Egypt? Why did you bring us out here to die?" },
            ],
            prompt: "You are Moses. The people are panicking. What do you say?",
            choices: [
              { text: "\"Fear not. Stand firm, and see the salvation of the Lord\"", next: "stand", xp: 20, outcome: "good" },
              { text: "\"Everyone swim for it! Scatter!\"", next: "panic", outcome: "bad" },
            ],
          },
          {
            id: "panic",
            reference: "Exodus 14:13-14",
            panels: [
              { speaker: "narrator", text: "Panic scatters people, but it has never once parted a sea. Moses remembers who fights this battle." },
              { speaker: "character", name: "Moses", text: "Fear not! The Lord will fight for you, and you have only to be silent." },
            ],
            choices: [{ text: "Stand firm", next: "stand", xp: 10 }],
          },
          {
            id: "stand",
            reference: "Exodus 14:15-16",
            panels: [
              { speaker: "voice", name: "The Lord", text: "Why do you cry to Me? Tell the people of Israel to go forward. Lift up your staff, and stretch out your hand over the sea and divide it." },
              { speaker: "character", name: "Moses", text: "Forward? Into the sea? ...Yes, Lord. Forward." },
            ],
            ending: "victory",
          },
        ],
      },
      {
        id: "moses-2",
        character: "Moses",
        title: "Chapter 2: The Sea Divides",
        blurb: "A wall of water on the right, a wall on the left, and dry ground beneath.",
        art: "redsea",
        difficulty: "easy",
        reference: "Exodus 14:19-22",
        startNode: "pillar",
        nodes: [
          {
            id: "pillar",
            reference: "Exodus 14:19-20",
            panels: [
              { speaker: "narrator", text: "The angel of God moves behind the camp, and the pillar of cloud shifts between the Egyptians and Israel — darkness to one side, light to the other. All night, the army cannot come near." },
              { speaker: "narrator", text: "Moses stretches out his hand over the sea. The Lord drives the sea back by a strong east wind all night, and makes the sea dry land." },
            ],
            prompt: "The waters divide into two walls. The path is open. What do the people do?",
            choices: [
              { text: "Walk through on dry ground, walls of water on either side", next: "through", xp: 20, outcome: "good" },
              { text: "Wait on the shore until the water walls look safer", next: "wait", outcome: "bad" },
            ],
          },
          {
            id: "wait",
            reference: "Exodus 14:22",
            panels: [
              { speaker: "narrator", text: "The walls of water will not look safer. Some doors of God are walked through by faith, not by eyesight." },
              { speaker: "character", name: "Moses", text: "The Lord has opened the way. Go forward — do not stand at the edge of your miracle." },
            ],
            choices: [{ text: "Walk through", next: "through", xp: 10 }],
          },
          {
            id: "through",
            reference: "Exodus 14:22-25",
            panels: [
              { speaker: "narrator", text: "The people of Israel go into the midst of the sea on dry ground, the waters being a wall to them on their right hand and on their left." },
              { speaker: "narrator", text: "The Egyptians pursue — and in the morning watch, the Lord throws their army into confusion. Chariot wheels clog and fall off." },
              { speaker: "character", name: "Egyptian soldier", text: "Let us flee! The Lord fights for them against Egypt!" },
            ],
            ending: "victory",
          },
        ],
      },
      {
        id: "moses-3",
        character: "Moses",
        title: "Chapter 3: The Song of the Sea",
        blurb: "The sea closes, the army is gone, and Israel sings on the far shore.",
        art: "redsea",
        difficulty: "easy",
        reference: "Exodus 14:26 - 15:21",
        startNode: "stretch",
        nodes: [
          {
            id: "stretch",
            reference: "Exodus 14:26-28",
            panels: [
              { speaker: "voice", name: "The Lord", text: "Stretch out your hand over the sea, that the water may come back upon the Egyptians." },
              { speaker: "narrator", text: "Moses stretches out his hand, and at dawn the sea returns to its course. The waters cover the chariots and the horsemen — of all Pharaoh's army, not one remains." },
              { speaker: "narrator", text: "But the people of Israel walk on dry ground through the midst of the sea." },
            ],
            prompt: "Safe on the far shore, how does Israel respond?",
            choices: [
              { text: "Sing: \"The Lord is my strength and my song; He has become my salvation\"", next: "song", xp: 20, outcome: "good" },
              { text: "Immediately start worrying about food and water in the desert", next: "worry", outcome: "bad" },
            ],
          },
          {
            id: "worry",
            reference: "Exodus 15:1",
            panels: [
              { speaker: "narrator", text: "Worry will come soon enough — the desert has lessons ahead. But this moment belongs to praise. A miracle uncelebrated is a miracle half-received." },
              { speaker: "character", name: "Moses", text: "First, we sing. Then we walk." },
            ],
            choices: [{ text: "Sing the song", next: "song", xp: 10 }],
          },
          {
            id: "song",
            reference: "Exodus 15:1-21",
            panels: [
              { speaker: "character", name: "Moses", text: "I will sing to the Lord, for He has triumphed gloriously! The horse and his rider He has thrown into the sea!" },
              { speaker: "character", name: "Miriam", text: "Sing to the Lord, for He has triumphed gloriously!" },
              { speaker: "narrator", text: "Miriam takes a tambourine, and all the women go out after her with tambourines and dancing. Israel feared the Lord, and believed in Him and in His servant Moses." },
            ],
            ending: "victory",
          },
        ],
      },
    ],
  },
  {
    id: "storm",
    title: "Jesus Calms the Storm",
    blurb: "A night crossing turns deadly — and the disciples meet the Lord of wind and wave.",
    art: "storm",
    reference: "Mark 4:35-41",
    chapters: [
      {
        id: "storm-1",
        character: "A Disciple",
        title: "Chapter 1: The Crossing",
        blurb: "\"Let us go across to the other side\" — and into a storm.",
        art: "storm",
        difficulty: "easy",
        reference: "Mark 4:35-37",
        startNode: "evening",
        nodes: [
          {
            id: "evening",
            reference: "Mark 4:35-37",
            panels: [
              { speaker: "narrator", text: "Evening falls on the Sea of Galilee. You are one of the disciples, and Jesus has spent the whole day teaching crowds from a boat." },
              { speaker: "character", name: "Jesus", text: "Let us go across to the other side." },
              { speaker: "narrator", text: "Halfway across, a great windstorm rises. Waves break into the boat, and it is already filling with water. And Jesus — Jesus is asleep on the cushion in the stern." },
            ],
            prompt: "Water is pouring in. What do you do?",
            choices: [
              { text: "Wake Him: \"Teacher, do You not care that we are perishing?\"", next: "wake", xp: 15, outcome: "good" },
              { text: "Bail harder and trust your own seamanship — you are fishermen, after all", next: "bail", outcome: "bad" },
            ],
          },
          {
            id: "bail",
            reference: "Mark 4:37-38",
            panels: [
              { speaker: "narrator", text: "You bail until your arms burn, but the sea is faster than your buckets. Some storms are not meant to be out-worked — they are meant to drive you to the One asleep in the stern." },
              { speaker: "character", name: "Peter", text: "Enough! Wake the Master!" },
            ],
            choices: [{ text: "Wake Jesus", next: "wake", xp: 10 }],
          },
          {
            id: "wake",
            reference: "Mark 4:38",
            panels: [
              { speaker: "character", name: "Disciples", text: "Teacher, do You not care that we are perishing?" },
              { speaker: "narrator", text: "Jesus rises. The wind screams. The sea heaves. And He turns to face the storm." },
            ],
            ending: "victory",
          },
        ],
      },
      {
        id: "storm-2",
        character: "A Disciple",
        title: "Chapter 2: Peace, Be Still",
        blurb: "Three words, and the sea lies down like a sleeping child.",
        art: "storm",
        difficulty: "easy",
        reference: "Mark 4:39-41",
        startNode: "rebuke",
        nodes: [
          {
            id: "rebuke",
            reference: "Mark 4:39",
            panels: [
              { speaker: "narrator", text: "Jesus awoke and rebuked the wind, and said to the sea..." },
              { speaker: "character", name: "Jesus", text: "Peace! Be still!" },
              { speaker: "narrator", text: "The wind ceases, and there is a great calm. Not a slow settling — an instant, utter stillness, as if the sea had never moved." },
            ],
            prompt: "Jesus turns to you in the silence. What does He ask?",
            choices: [
              { text: "\"Why are you so afraid? Have you still no faith?\"", next: "faith", xp: 20, outcome: "good" },
              { text: "\"Who rowed us here?\"", next: "wrong", outcome: "bad" },
            ],
          },
          {
            id: "wrong",
            reference: "Mark 4:40",
            panels: [
              { speaker: "narrator", text: "No — His question cuts deeper than seamanship. It goes to the heart." },
              { speaker: "character", name: "Jesus", text: "Why are you so afraid? Have you still no faith?" },
            ],
            choices: [{ text: "Sit with the question", next: "faith", xp: 10 }],
          },
          {
            id: "faith",
            reference: "Mark 4:41",
            panels: [
              { speaker: "narrator", text: "The disciples are filled with great fear — a new kind of fear now, holier than the fear of the storm." },
              { speaker: "character", name: "Disciples", text: "Who then is this, that even the wind and the sea obey Him?" },
              { speaker: "narrator", text: "It is the question the whole Gospel of Mark answers. And on the far shore, they are about to learn even more." },
            ],
            ending: "victory",
          },
        ],
      },
    ],
  },
];

export const getComicStory = (id: string) => COMIC_STORIES.find((s) => s.id === id);
