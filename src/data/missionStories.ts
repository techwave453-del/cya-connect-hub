import { MissionImageKey } from "@/lib/missionArt";

export interface Panel {
  /** Who is talking in this speech bubble. */
  speaker: "narrator" | "character" | "voice";
  /** Optional name shown above the bubble. */
  name?: string;
  text: string;
}

export interface Choice {
  text: string;
  /** Node id this choice leads to. */
  next: string;
  /** XP awarded for taking this path. */
  xp?: number;
  /** Faithful to scripture / wise choice, or a misstep. */
  outcome?: "good" | "bad";
}

export interface StoryNode {
  id: string;
  /** Illustration for this scene. Falls back to the campaign art. */
  art?: MissionImageKey;
  reference?: string;
  panels: Panel[];
  /** Prompt shown above the reply bubbles. */
  prompt?: string;
  choices?: Choice[];
  /** Terminal node: the mission ends here. */
  ending?: "victory" | "setback";
  /** Node to jump back to when a setback is retried. */
  retryTo?: string;
}

export interface MissionCampaign {
  id: string;
  character: string;
  title: string;
  blurb: string;
  art: MissionImageKey;
  difficulty: "easy" | "medium" | "hard";
  reference: string;
  startNode: string;
  nodes: StoryNode[];
}

export const MISSION_CAMPAIGNS: MissionCampaign[] = [
  {
    id: "noah",
    character: "Noah",
    title: "The Ark Builder",
    blurb: "Build a vessel that will carry life through the flood.",
    art: "noah",
    difficulty: "easy",
    reference: "Genesis 6 - 9",
    startNode: "call",
    nodes: [
      {
        id: "call",
        reference: "Genesis 6:13-14",
        panels: [
          { speaker: "narrator", text: "You are Noah. The earth is filled with violence, and God has chosen to speak to you." },
          { speaker: "voice", name: "The Lord", text: "Make yourself an ark of gopher wood. Make rooms in it, and cover it inside and out with pitch." },
          { speaker: "character", name: "Noah", text: "A boat? There is no sea here. The neighbours will laugh for a hundred years." },
        ],
        prompt: "What do you do first?",
        choices: [
          { text: "Obey immediately and start gathering gopher wood", next: "materials", xp: 20, outcome: "good" },
          { text: "Wait for a sign that this is really God", next: "delay", outcome: "bad" },
          { text: "Ask the neighbours to help fund a smaller boat", next: "delay", outcome: "bad" },
        ],
      },
      {
        id: "delay",
        reference: "Hebrews 11:7",
        panels: [
          { speaker: "narrator", text: "Seasons pass while you hesitate. Nothing is built." },
          { speaker: "voice", name: "Scripture", text: "By faith Noah, being warned of God of things not seen as yet, moved with fear, prepared an ark." },
          { speaker: "character", name: "Noah", text: "Faith does not wait for the rain to start. Let me begin." },
        ],
        prompt: "Try again?",
        choices: [{ text: "Pick up the tools and obey", next: "materials", xp: 5 }],
      },
      {
        id: "materials",
        reference: "Genesis 6:14",
        panels: [
          { speaker: "narrator", text: "The frame rises. Now it must be made watertight before the waters come." },
          { speaker: "character", name: "Noah", text: "The joints still leak. What did the Lord say to use?" },
        ],
        prompt: "Seal the ark with...",
        choices: [
          { text: "Gopher wood coated with pitch, inside and out", next: "animals", xp: 30, outcome: "good" },
          { text: "Clay and river mud packed into the seams", next: "leak", outcome: "bad" },
          { text: "Woven reeds like a basket", next: "leak", outcome: "bad" },
        ],
      },
      {
        id: "leak",
        reference: "Genesis 6:14",
        panels: [
          { speaker: "narrator", text: "The first heavy rain finds every gap. Water pools in the hold." },
          { speaker: "character", name: "Noah", text: "God's instructions were exact: gopher wood, and pitch within and without." },
        ],
        prompt: "Repair the hull.",
        choices: [{ text: "Coat it with pitch as commanded", next: "animals", xp: 10 }],
      },
      {
        id: "animals",
        art: "shepherd",
        reference: "Genesis 7:2-3",
        panels: [
          { speaker: "narrator", text: "The ark is finished. Animals crowd the hillside, waiting." },
          { speaker: "voice", name: "The Lord", text: "Of every clean beast take to you by sevens, and of beasts that are not clean by two." },
        ],
        prompt: "How do you load them?",
        choices: [
          { text: "Sevens of the clean, pairs of the unclean, as commanded", next: "flood", xp: 30, outcome: "good" },
          { text: "Two of absolutely every kind, no exceptions", next: "flood", xp: 10 },
          { text: "Only the strongest animals — space is short", next: "flood", outcome: "bad" },
        ],
      },
      {
        id: "flood",
        reference: "Genesis 8:8-11",
        panels: [
          { speaker: "narrator", text: "Forty days of rain. Then silence, and the ark rests on Ararat." },
          { speaker: "character", name: "Noah", text: "I must know whether the ground is dry. But how?" },
        ],
        prompt: "Test the world outside.",
        choices: [
          { text: "Send out a raven, then a dove, and wait seven days between", next: "covenant", xp: 30, outcome: "good" },
          { text: "Throw open the door and step out now", next: "toosoon", outcome: "bad" },
        ],
      },
      {
        id: "toosoon",
        reference: "Genesis 8:5-9",
        panels: [
          { speaker: "narrator", text: "The valleys are still swamp. The dove would have found no rest for her foot." },
          { speaker: "character", name: "Noah", text: "Patience is part of obedience. I will send a bird first." },
        ],
        prompt: "Try again.",
        choices: [{ text: "Send the raven, then the dove", next: "covenant", xp: 10 }],
      },
      {
        id: "covenant",
        reference: "Genesis 9:13",
        panels: [
          { speaker: "narrator", text: "You build an altar. A bow of colour arches over the wet hills." },
          { speaker: "voice", name: "The Lord", text: "I do set my bow in the cloud, and it shall be for a token of a covenant between me and the earth." },
          { speaker: "character", name: "Noah", text: "Mission complete. Not by my strength, but by His word." },
        ],
        ending: "victory",
      },
    ],
  },
  {
    id: "gideon",
    character: "Gideon",
    title: "The Three Hundred",
    blurb: "Face Midian with far less than you think you need.",
    art: "gideon",
    difficulty: "medium",
    reference: "Judges 6 - 7",
    startNode: "winepress",
    nodes: [
      {
        id: "winepress",
        reference: "Judges 6:12",
        panels: [
          { speaker: "narrator", text: "You are Gideon, threshing wheat in a winepress so Midian will not see you." },
          { speaker: "voice", name: "Angel of the Lord", text: "The Lord is with you, you mighty man of valour." },
          { speaker: "character", name: "Gideon", text: "Valour? I am the least in my father's house." },
        ],
        prompt: "How do you answer the call?",
        choices: [
          { text: "Ask for confirmation, then tear down Baal's altar", next: "fleece", xp: 20, outcome: "good" },
          { text: "Refuse — someone stronger should lead", next: "refuse", outcome: "bad" },
        ],
      },
      {
        id: "refuse",
        reference: "Judges 6:14",
        panels: [
          { speaker: "narrator", text: "Midian's camels strip the fields again while you stay hidden." },
          { speaker: "voice", name: "The Lord", text: "Go in this your might. Have not I sent you?" },
        ],
        prompt: "Answer again.",
        choices: [{ text: "Step out in the strength He gives", next: "fleece", xp: 5 }],
      },
      {
        id: "fleece",
        reference: "Judges 6:36-40",
        panels: [
          { speaker: "character", name: "Gideon", text: "I will lay a fleece on the threshing floor. Let the sign be clear." },
          { speaker: "narrator", text: "Morning one: the fleece is soaked, the ground dry. Morning two: the fleece is dry, the ground wet." },
        ],
        prompt: "Thirty-two thousand men now stand with you. What does God say?",
        choices: [
          { text: "The army is too large — God will thin it", next: "fearful", xp: 25, outcome: "good" },
          { text: "Recruit even more men from the northern tribes", next: "pride", outcome: "bad" },
        ],
      },
      {
        id: "pride",
        art: "warrior",
        reference: "Judges 7:2",
        panels: [
          { speaker: "voice", name: "The Lord", text: "The people that are with you are too many, lest Israel vaunt themselves, saying, My own hand has saved me." },
          { speaker: "character", name: "Gideon", text: "Then the victory must look impossible, so that it is clearly His." },
        ],
        prompt: "Continue.",
        choices: [{ text: "Send the fearful home", next: "fearful", xp: 10 }],
      },
      {
        id: "fearful",
        art: "warrior",
        reference: "Judges 7:3-7",
        panels: [
          { speaker: "narrator", text: "Twenty-two thousand leave. Ten thousand remain — still too many." },
          { speaker: "voice", name: "The Lord", text: "Bring them down to the water, and I will try them for you there." },
        ],
        prompt: "Which men do you keep?",
        choices: [
          { text: "Those who lapped water with their tongues, like a dog", next: "trumpets", xp: 35, outcome: "good" },
          { text: "Those who knelt down and drank deeply", next: "wrongmen", outcome: "bad" },
          { text: "The tallest and best armed", next: "wrongmen", outcome: "bad" },
        ],
      },
      {
        id: "wrongmen",
        reference: "Judges 7:5-6",
        panels: [
          { speaker: "narrator", text: "The camp watch is slow to rise; heads were down at the stream." },
          { speaker: "voice", name: "The Lord", text: "By the three hundred men that lapped will I save you." },
        ],
        prompt: "Re-select your company.",
        choices: [{ text: "Keep the three hundred who lapped", next: "trumpets", xp: 10 }],
      },
      {
        id: "trumpets",
        reference: "Judges 7:16-22",
        panels: [
          { speaker: "narrator", text: "Three hundred men. Midian fills the valley like locusts." },
          { speaker: "character", name: "Gideon", text: "We attack at the middle watch. But with what weapons?" },
        ],
        prompt: "Arm the three hundred.",
        choices: [
          { text: "Trumpets, empty pitchers and torches hidden inside", next: "victory", xp: 40, outcome: "good" },
          { text: "Swords and shields for a silent raid", next: "raid", outcome: "bad" },
        ],
      },
      {
        id: "raid",
        reference: "Judges 7:20",
        panels: [
          { speaker: "narrator", text: "Three hundred blades against thousands is arithmetic, not faith." },
          { speaker: "character", name: "Gideon", text: "The sword of the Lord and of Gideon — let the trumpets speak first." },
        ],
        prompt: "Try again.",
        choices: [{ text: "Trumpets, pitchers and torches", next: "victory", xp: 10 }],
      },
      {
        id: "victory",
        reference: "Judges 7:21-22",
        panels: [
          { speaker: "narrator", text: "Pitchers shatter, torches blaze, trumpets scream. Midian turns its swords on itself and flees." },
          { speaker: "character", name: "Gideon", text: "Mission complete. Three hundred, and the Lord of hosts." },
        ],
        ending: "victory",
      },
    ],
  },
  {
    id: "esther",
    character: "Esther",
    title: "For Such a Time as This",
    blurb: "Risk the throne room to save your people.",
    art: "esther",
    difficulty: "medium",
    reference: "Esther 4 - 7",
    startNode: "news",
    nodes: [
      {
        id: "news",
        reference: "Esther 4:13-14",
        panels: [
          { speaker: "narrator", text: "You are Esther, queen of Persia. Haman's decree has been sealed: every Jew is to be destroyed." },
          { speaker: "voice", name: "Mordecai", text: "Think not that you shall escape in the king's house. Who knows whether you are come to the kingdom for such a time as this?" },
        ],
        prompt: "How do you respond?",
        choices: [
          { text: "Call the Jews of Susa to fast with you three days", next: "fast", xp: 25, outcome: "good" },
          { text: "Stay silent — the palace may protect you", next: "silence", outcome: "bad" },
          { text: "Rush into the throne room immediately, unprepared", next: "rush", outcome: "bad" },
        ],
      },
      {
        id: "silence",
        reference: "Esther 4:14",
        panels: [
          { speaker: "narrator", text: "Silence buys nothing; the date of the decree keeps moving closer." },
          { speaker: "voice", name: "Mordecai", text: "Deliverance will arise from another place, but you and your father's house shall be destroyed." },
        ],
        prompt: "Choose again.",
        choices: [{ text: "Call for a fast and prepare to act", next: "fast", xp: 5 }],
      },
      {
        id: "rush",
        reference: "Esther 4:16",
        panels: [
          { speaker: "narrator", text: "Courage without prayer is only nerve." },
          { speaker: "character", name: "Esther", text: "Fast for me, and I will go in to the king; and if I perish, I perish." },
        ],
        prompt: "Continue.",
        choices: [{ text: "Fast three days first", next: "fast", xp: 10 }],
      },
      {
        id: "fast",
        reference: "Esther 5:1-2",
        panels: [
          { speaker: "narrator", text: "Three days. On the third you put on royal apparel and stand in the inner court — uninvited, a capital offence." },
          { speaker: "narrator", text: "The king holds out the golden sceptre. You live." },
          { speaker: "voice", name: "King Ahasuerus", text: "What will you, Queen Esther? It shall be given you, even to the half of the kingdom." },
        ],
        prompt: "What is your petition?",
        choices: [
          { text: "Invite the king and Haman to a banquet you have prepared", next: "banquet", xp: 30, outcome: "good" },
          { text: "Accuse Haman here and now in open court", next: "accuse", outcome: "bad" },
        ],
      },
      {
        id: "accuse",
        art: "king",
        reference: "Esther 5:4",
        panels: [
          { speaker: "narrator", text: "Haman stands at the king's right hand with every advantage. A raw accusation is his word against yours." },
          { speaker: "character", name: "Esther", text: "Wisdom chooses its moment. Let the king come to my banquet." },
        ],
        prompt: "Try again.",
        choices: [{ text: "Invite them to the banquet", next: "banquet", xp: 10 }],
      },
      {
        id: "banquet",
        art: "king",
        reference: "Esther 5:8; 6:1",
        panels: [
          { speaker: "narrator", text: "At the first banquet the king asks again. You invite them to a second." },
          { speaker: "narrator", text: "That night the king cannot sleep, and the chronicles are read aloud — Mordecai once saved his life and was never rewarded." },
        ],
        prompt: "The second banquet begins. Now what?",
        choices: [
          { text: "Reveal your people, and name Haman as the enemy", next: "reveal", xp: 40, outcome: "good" },
          { text: "Ask only for money to buy your people's safety", next: "money", outcome: "bad" },
        ],
      },
      {
        id: "money",
        reference: "Esther 7:4",
        panels: [
          { speaker: "narrator", text: "Silver cannot answer a sealed decree of destruction." },
          { speaker: "character", name: "Esther", text: "We are sold, I and my people, to be destroyed. Let my life be given me at my petition." },
        ],
        prompt: "Continue.",
        choices: [{ text: "Name the adversary", next: "reveal", xp: 10 }],
      },
      {
        id: "reveal",
        reference: "Esther 7:6, 8:11",
        panels: [
          { speaker: "character", name: "Esther", text: "The adversary and enemy is this wicked Haman." },
          { speaker: "narrator", text: "Haman falls. A new decree lets the Jews defend themselves, and mourning turns into feasting." },
          { speaker: "character", name: "Esther", text: "Mission complete — for such a time as this." },
        ],
        ending: "victory",
      },
    ],
  },
  {
    id: "elijah",
    character: "Elijah",
    title: "Fire and Rain",
    blurb: "Confront the prophets of Baal and end the drought.",
    art: "elijah",
    difficulty: "hard",
    reference: "1 Kings 18",
    startNode: "summons",
    nodes: [
      {
        id: "summons",
        reference: "1 Kings 18:19",
        panels: [
          { speaker: "narrator", text: "You are Elijah. Three years without rain. King Ahab calls you the troubler of Israel." },
          { speaker: "character", name: "Elijah", text: "I have not troubled Israel — but you, in following Baal." },
        ],
        prompt: "What do you demand?",
        choices: [
          { text: "Gather all Israel and the 450 prophets of Baal to Mount Carmel", next: "altar", xp: 25, outcome: "good" },
          { text: "Confront Ahab privately in the palace", next: "private", outcome: "bad" },
        ],
      },
      {
        id: "private",
        art: "king",
        reference: "1 Kings 18:21",
        panels: [
          { speaker: "narrator", text: "A quiet word changes nothing while the whole nation limps between two opinions." },
          { speaker: "character", name: "Elijah", text: "How long halt you between two opinions? Let the people see and choose." },
        ],
        prompt: "Continue.",
        choices: [{ text: "Call the nation to Carmel", next: "altar", xp: 10 }],
      },
      {
        id: "altar",
        reference: "1 Kings 18:23-24",
        panels: [
          { speaker: "narrator", text: "Two bullocks, two altars, no fire lit by human hands." },
          { speaker: "character", name: "Elijah", text: "Call on the name of your gods, and I will call on the name of the Lord; the God that answers by fire, let him be God." },
        ],
        prompt: "Who goes first?",
        choices: [
          { text: "Let Baal's prophets go first — they are many", next: "baal", xp: 20, outcome: "good" },
          { text: "Go first yourself to settle it quickly", next: "baal", xp: 5 },
        ],
      },
      {
        id: "baal",
        reference: "1 Kings 18:26-29",
        panels: [
          { speaker: "narrator", text: "From morning to noon they cry, leap and cut themselves. No voice. No answer." },
          { speaker: "character", name: "Elijah", text: "Cry aloud — perhaps he is talking, or pursuing, or on a journey." },
        ],
        prompt: "Your turn. Prepare your altar.",
        choices: [
          { text: "Rebuild the Lord's altar with twelve stones and drench it with water three times", next: "fire", xp: 40, outcome: "good" },
          { text: "Keep it dry so the fire catches easily", next: "dry", outcome: "bad" },
        ],
      },
      {
        id: "dry",
        reference: "1 Kings 18:33-35",
        panels: [
          { speaker: "narrator", text: "If it can be explained, it will be explained away." },
          { speaker: "character", name: "Elijah", text: "Fill four barrels with water and pour it on the sacrifice. Do it a second time. Do it a third." },
        ],
        prompt: "Try again.",
        choices: [{ text: "Twelve stones, and water until the trench is full", next: "fire", xp: 10 }],
      },
      {
        id: "fire",
        reference: "1 Kings 18:38-39",
        panels: [
          { speaker: "character", name: "Elijah", text: "Lord God of Abraham, Isaac and Israel, let it be known this day that you are God in Israel." },
          { speaker: "narrator", text: "Fire falls and consumes the sacrifice, the wood, the stones, the dust, and licks up the water in the trench." },
          { speaker: "voice", name: "The people", text: "The Lord, he is the God! The Lord, he is the God!" },
        ],
        prompt: "Now end the drought.",
        choices: [
          { text: "Bow low in prayer and send your servant to look toward the sea seven times", next: "rain", xp: 40, outcome: "good" },
          { text: "Announce the rain and wait for it to arrive", next: "wait", outcome: "bad" },
        ],
      },
      {
        id: "wait",
        reference: "1 Kings 18:42-43",
        panels: [
          { speaker: "narrator", text: "Announcing is not interceding. The sky stays brass." },
          { speaker: "character", name: "Elijah", text: "Go again, seven times. Tell me what you see." },
        ],
        prompt: "Try again.",
        choices: [{ text: "Pray, and send the servant seven times", next: "rain", xp: 10 }],
      },
      {
        id: "rain",
        reference: "1 Kings 18:44-45",
        panels: [
          { speaker: "voice", name: "The servant", text: "There arises a little cloud out of the sea, like a man's hand." },
          { speaker: "narrator", text: "The heaven goes black with clouds and wind, and there is a great rain. You run before Ahab's chariot to Jezreel." },
          { speaker: "character", name: "Elijah", text: "Mission complete. The God who answers by fire also sends the rain." },
        ],
        ending: "victory",
      },
    ],
  },
  {
    id: "ananias",
    character: "Ananias",
    title: "The Street Called Straight",
    blurb: "Go and pray for the man who came to arrest you.",
    art: "ananias",
    difficulty: "medium",
    reference: "Acts 9",
    startNode: "vision",
    nodes: [
      {
        id: "vision",
        reference: "Acts 9:10-12",
        panels: [
          { speaker: "narrator", text: "You are Ananias, a disciple in Damascus. The Lord speaks to you in a vision." },
          { speaker: "voice", name: "The Lord", text: "Arise, and go into the street which is called Straight, and enquire in the house of Judas for one called Saul of Tarsus." },
          { speaker: "character", name: "Ananias", text: "Lord, I have heard how much evil this man has done to your saints at Jerusalem." },
        ],
        prompt: "What do you do?",
        choices: [
          { text: "Bring your fear to God honestly, then obey", next: "go", xp: 25, outcome: "good" },
          { text: "Warn the church to hide and say nothing to Saul", next: "hide", outcome: "bad" },
          { text: "Send someone else in your place", next: "hide", outcome: "bad" },
        ],
      },
      {
        id: "hide",
        reference: "Acts 9:15",
        panels: [
          { speaker: "voice", name: "The Lord", text: "Go your way: for he is a chosen vessel unto me, to bear my name before the Gentiles, and kings, and the children of Israel." },
          { speaker: "character", name: "Ananias", text: "Then the man I fear is the man God has chosen. I will go." },
        ],
        prompt: "Continue.",
        choices: [{ text: "Go to Straight Street", next: "go", xp: 10 }],
      },
      {
        id: "go",
        reference: "Acts 9:11",
        panels: [
          { speaker: "narrator", text: "You find the house of Judas. Inside, a blind man has been fasting for three days." },
        ],
        prompt: "How do you greet him?",
        choices: [
          { text: "Put your hands on him and call him 'Brother Saul'", next: "sight", xp: 35, outcome: "good" },
          { text: "Demand he repent of everything he has done first", next: "harsh", outcome: "bad" },
        ],
      },
      {
        id: "harsh",
        reference: "Acts 9:17",
        panels: [
          { speaker: "narrator", text: "Grace received should be grace given." },
          { speaker: "character", name: "Ananias", text: "Brother Saul, the Lord, even Jesus, has sent me that you might receive your sight." },
        ],
        prompt: "Try again.",
        choices: [{ text: "Greet him as a brother", next: "sight", xp: 10 }],
      },
      {
        id: "sight",
        art: "disciple",
        reference: "Acts 9:18-20",
        panels: [
          { speaker: "narrator", text: "Something like scales falls from his eyes. He sees, rises, and is baptised." },
        ],
        prompt: "What happens next in Damascus?",
        choices: [
          { text: "Saul preaches Christ in the synagogues straight away", next: "end", xp: 30, outcome: "good" },
          { text: "Saul is kept quiet for a year in case he relapses", next: "end", xp: 5 },
        ],
      },
      {
        id: "end",
        reference: "Acts 9:20-22",
        panels: [
          { speaker: "narrator", text: "The persecutor becomes the preacher, and all who hear are amazed." },
          { speaker: "character", name: "Ananias", text: "Mission complete. God sent me to the last man I would have chosen." },
        ],
        ending: "victory",
      },
    ],
  },
  {
    id: "eliezer",
    character: "Abraham's Servant",
    title: "The Test at the Well",
    blurb: "Find a wife for Isaac and read God's guidance rightly.",
    art: "eliezer",
    difficulty: "hard",
    reference: "Genesis 24",
    startNode: "oath",
    nodes: [
      {
        id: "oath",
        reference: "Genesis 24:3-4",
        panels: [
          { speaker: "narrator", text: "You are Abraham's senior servant, trusted with everything he owns." },
          { speaker: "voice", name: "Abraham", text: "You shall go unto my country, and to my kindred, and take a wife unto my son Isaac." },
          { speaker: "character", name: "The servant", text: "And if the woman will not follow me to this land?" },
        ],
        prompt: "How do you take the journey?",
        choices: [
          { text: "Swear the oath, take ten camels, and set out for Mesopotamia", next: "well", xp: 25, outcome: "good" },
          { text: "Find a local Canaanite bride — it is far simpler", next: "local", outcome: "bad" },
        ],
      },
      {
        id: "local",
        reference: "Genesis 24:3",
        panels: [
          { speaker: "voice", name: "Abraham", text: "You shall not take a wife unto my son of the daughters of the Canaanites among whom I dwell." },
          { speaker: "character", name: "The servant", text: "Convenience is not obedience. To Nahor's city, then." },
        ],
        prompt: "Continue.",
        choices: [{ text: "Set out for Abraham's kindred", next: "well", xp: 10 }],
      },
      {
        id: "well",
        reference: "Genesis 24:12-14",
        panels: [
          { speaker: "narrator", text: "Evening. The women of the city come out to draw water. You kneel by the well." },
          { speaker: "character", name: "The servant", text: "O Lord God of my master Abraham, send me good speed this day." },
        ],
        prompt: "What sign do you ask for?",
        choices: [
          { text: "The woman who gives me a drink and offers to water all my camels", next: "rebekah", xp: 40, outcome: "good" },
          { text: "The most beautiful woman at the well", next: "beauty", outcome: "bad" },
          { text: "The first woman who greets me by name", next: "beauty", outcome: "bad" },
        ],
      },
      {
        id: "beauty",
        art: "woman",
        reference: "Genesis 24:14",
        panels: [
          { speaker: "narrator", text: "A face tells you nothing about a heart. Ten thirsty camels tell you a great deal." },
          { speaker: "character", name: "The servant", text: "Let her that says, Drink, and I will give your camels drink also, be the one appointed." },
        ],
        prompt: "Try again.",
        choices: [{ text: "Ask for the sign of the camels", next: "rebekah", xp: 10 }],
      },
      {
        id: "rebekah",
        art: "woman",
        reference: "Genesis 24:18-20",
        panels: [
          { speaker: "narrator", text: "Before you finish praying, Rebekah comes down with her pitcher." },
          { speaker: "voice", name: "Rebekah", text: "Drink, my lord. I will draw water for your camels also, until they have done drinking." },
        ],
        prompt: "How do you respond?",
        choices: [
          { text: "Watch in silence, then worship the Lord for leading you", next: "family", xp: 35, outcome: "good" },
          { text: "Announce the whole mission loudly before the sign is complete", next: "family", xp: 5 },
        ],
      },
      {
        id: "family",
        reference: "Genesis 24:49-58",
        panels: [
          { speaker: "narrator", text: "In her father's house you tell the story plainly and refuse to eat until you have spoken." },
          { speaker: "voice", name: "Laban and Bethuel", text: "The thing proceeds from the Lord: we cannot speak unto you bad or good." },
        ],
        prompt: "They ask for ten more days. What do you say?",
        choices: [
          { text: "Ask to leave at once, and let Rebekah herself decide", next: "end", xp: 30, outcome: "good" },
          { text: "Agree to wait and enjoy the hospitality", next: "end", xp: 5 },
        ],
      },
      {
        id: "end",
        reference: "Genesis 24:58, 67",
        panels: [
          { speaker: "voice", name: "Rebekah", text: "I will go." },
          { speaker: "narrator", text: "Isaac meets her in the field at evening, and he is comforted after his mother's death." },
          { speaker: "character", name: "The servant", text: "Mission complete. I being in the way, the Lord led me." },
        ],
        ending: "victory",
      },
    ],
  },
];

export const getCampaign = (id: string) => MISSION_CAMPAIGNS.find((c) => c.id === id);
