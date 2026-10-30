import type {
  Aspect,
  Exposure,
  Hardiness,
  JobShift,
  Moisture,
  PhLevel,
  Plant,
  PlantTask,
  SoilType,
  SunLevel,
} from "../types";
import { MONTH_NAMES } from "../types";
import { BULB_FACTS } from "./bulb-facts";
import { ALL_ASPECTS, BOTH, SUNNY_ASPECTS, plant, year } from "./shared";

type Season = "bulb" | "tender" | "indoor" | "naked" | "saffron";

interface BulbProfile {
  season: Season;
  hardiness: Hardiness;
  sun: SunLevel[];
  aspect: Aspect[];
  soils: SoilType[];
  moisture: Moisture[];
  ph: PhLevel[];
  exposure: Exposure[];
  cultivation: string;
  pests: string;
  planting: string;
  plantMonth: number;
  plantShift: JobShift;
  plantTitle: string;
  liftMonth?: number;
  maturity: string;
  heightM: [number, number];
}

const drained: SoilType[] = ["chalk", "loam", "sand"];
const neutral: PhLevel[] = ["neutral", "alkaline"];
const sheltered: Exposure[] = ["sheltered"];

const PROFILES: Record<string, BulbProfile> = {
  tulipa: {
    season: "bulb",
    hardiness: "H6",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant the bulbs in autumn, in fertile soil that does not sit wet through winter. Let the leaves yellow before you remove them, and treat the show as strongest in its first spring.",
    pests: "Squirrels dig new bulbs. Slugs, aphids and tulip fire mark leaves in a wet spring.",
    planting: "10–15 cm deep, point upwards, once the soil has cooled",
    plantMonth: 9,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the first spring after planting",
    heightM: [0.4, 0.55],
  },
  narcissus: {
    season: "bulb",
    hardiness: "H6",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained", "moist"],
    ph: neutral,
    exposure: BOTH,
    cultivation:
      "Plant in autumn and leave the clump undisturbed. They take heavier soil than a tulip as long as it is not waterlogged, and they return for many years.",
    pests: "Narcissus fly can hollow the bulb. Slugs graze young shoots.",
    planting: "10–15 cm deep, with the nose upwards",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the first spring and then clumps up",
    heightM: [0.3, 0.45],
  },
  allium: {
    season: "bulb",
    hardiness: "H6",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: BOTH,
    cultivation:
      "Plant in autumn in a sunny, open spot. The leaves often fade as the flowers open, so set them among perennials that can hide the yellowing foliage.",
    pests: "Usually left alone by deer and rabbits. Poor drainage rots the bulb.",
    planting: "about three times the bulb’s depth",
    plantMonth: 9,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the first summer after planting",
    heightM: [0.6, 0.9],
  },
  crocus: {
    season: "bulb",
    hardiness: "H6",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: BOTH,
    cultivation:
      "Plant the corms in early autumn, in short grass or the front of a border. They need sun while the leaves are growing and a dry rest afterwards.",
    pests: "Mice and squirrels take the corms. Plant a little deeper if they are being dug up.",
    planting: "8 cm deep, in a drift rather than a single row",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant corms",
    maturity: "Flowers the first season and can seed about",
    heightM: [0.08, 0.15],
  },
  "crocus-sativus": {
    season: "saffron",
    hardiness: "H5",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant the corms in late summer in a warm, free-draining spot. The flowers open in autumn and the leaves stay through winter. Pick the three red stigmas as the flower opens and dry them for the kitchen.",
    pests: "Wet soil rots the corms. Mice will dig them if they are planted too shallowly.",
    planting: "10 cm deep in August, in a sunny bed that dries in summer",
    plantMonth: 7,
    plantShift: "autumn",
    plantTitle: "Plant corms",
    maturity: "Flowers the first autumn if the corms are a flowering size",
    heightM: [0.1, 0.15],
  },
  hyacinthus: {
    season: "bulb",
    hardiness: "H6",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant in autumn, or pot them for a cool porch. The first spring is the fullest; after that the spikes are looser and still strongly scented.",
    pests: "Squirrels unearth the bulbs. A wet winter can rot them.",
    planting: "10 cm deep outdoors, or with the nose just proud in a pot",
    plantMonth: 9,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the first spring after planting",
    heightM: [0.2, 0.3],
  },
  lilium: {
    season: "bulb",
    hardiness: "H5",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant in autumn or early spring, with grit if the soil is heavy. Many lilies like their flowers in the sun and their roots in the shade of neighbouring leaves. Stake tall stems before the buds open.",
    pests: "Lily beetle and its grubs strip the leaves. Slugs take the emerging shoot.",
    planting: "15 cm deep, and put a cane in at the same time",
    plantMonth: 9,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers in the first or second summer",
    heightM: [0.8, 1.2],
  },
  dahlia: {
    season: "tender",
    hardiness: "H3",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: ["loam", "sand", "chalk"],
    moisture: ["well-drained"],
    ph: ["neutral"],
    exposure: sheltered,
    cultivation:
      "Start the tubers in pots under cover, or plant them out after the last frost in rich soil. Pinch the growing tip once for a bushier plant, and keep deadheading. Lift the clump after the first frost and store it dry and frost-free.",
    pests: "Slugs clear young shoots. Earwigs hide in the flowers, and aphids gather on soft tips.",
    planting: "after the last frost, with the crown just under the surface",
    plantMonth: 4,
    plantShift: "spring",
    plantTitle: "Plant tubers",
    liftMonth: 9,
    maturity: "Flowers the first summer",
    heightM: [0.8, 1.2],
  },
  gladiolus: {
    season: "tender",
    hardiness: "H3",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant the corms in spring, once the soil is warming, and stake the tall spikes. Lift them before a hard frost, dry them, and keep the new corm that forms on top of the old one.",
    pests: "Thrips silver the flowers in a hot summer. Slugs damage the shoot.",
    planting: "10 cm deep, in succession if you want a longer show",
    plantMonth: 3,
    plantShift: "spring",
    plantTitle: "Plant corms",
    liftMonth: 9,
    maturity: "Flowers about three months after planting",
    heightM: [0.8, 1.1],
  },
  acidanthera: {
    season: "tender",
    hardiness: "H3",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant in late spring in a warm border or a pot. The scented flowers open late in summer. Lift the corms with gladioli and store them dry.",
    pests: "A cold, wet site stops them flowering. Slugs nip the shoots.",
    planting: "10 cm deep after the last frost",
    plantMonth: 4,
    plantShift: "spring",
    plantTitle: "Plant corms",
    liftMonth: 9,
    maturity: "Flowers the first late summer",
    heightM: [0.6, 0.9],
  },
  fritillaria: {
    season: "bulb",
    hardiness: "H6",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant on their side in autumn so water does not sit in the hollow crown. Crown imperials want a deep, rich hole; the smaller species prefer sharp drainage and a little shade.",
    pests:
      "The foxy smell of crown imperials puts off rodents. Lily beetle sometimes attacks the leaves.",
    planting: "four times the bulb’s depth, on a bed of grit",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the following spring",
    heightM: [0.3, 0.8],
  },
  muscari: {
    season: "bulb",
    hardiness: "H6",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: BOTH,
    cultivation:
      "Plant in autumn near the front of a border or under deciduous shrubs. Most grape hyacinths increase steadily and can be split when the clumps are crowded.",
    pests: "Almost trouble-free. Very wet soil is the usual cause of loss.",
    planting: "8 cm deep, in generous groups",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the first spring and then spreads",
    heightM: [0.1, 0.2],
  },
  iris: {
    season: "bulb",
    hardiness: "H6",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: BOTH,
    cultivation:
      "Plant bulb irises in autumn in a sunny, well-drained place. The short reticulata kinds suit a rock garden or a pot; Dutch irises need a deeper, warmer bed.",
    pests: "Ink disease blotches the bulbs in store. Slugs may graze the flowers.",
    planting: "8–10 cm deep for dwarf kinds, a little deeper for Dutch irises",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the first season after planting",
    heightM: [0.15, 0.5],
  },
  anemone: {
    season: "bulb",
    hardiness: "H5",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Soak the dry claws overnight and plant them in autumn, or in early spring in a cold garden. They like a warm spot and repay a winter mulch.",
    pests: "Slugs and aphids. Corms that never plump up after soaking usually fail.",
    planting: "5 cm deep after an overnight soak",
    plantMonth: 9,
    plantShift: "autumn",
    plantTitle: "Plant claws",
    maturity: "Flowers the first season",
    heightM: [0.15, 0.3],
  },
  nemorosa: {
    season: "bulb",
    hardiness: "H6",
    sun: ["partial-sun", "shade"],
    aspect: ALL_ASPECTS,
    soils: ["clay", "loam", "chalk"],
    moisture: ["moist", "well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant the thin rhizomes just under the leaf litter in autumn, in deciduous shade. They die back by midsummer and should be left undisturbed.",
    pests: "Drying out in the first spring is the main loss. Little else bothers them.",
    planting: "just below the surface, in leafy soil",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant rhizomes",
    maturity: "Flowers the following spring and then runs about",
    heightM: [0.1, 0.15],
  },
  camassia: {
    season: "bulb",
    hardiness: "H4",
    sun: ["full-sun", "partial-sun"],
    aspect: ALL_ASPECTS,
    soils: ["clay", "loam"],
    moisture: ["moist", "well-drained"],
    ph: ["acid", "neutral"],
    exposure: sheltered,
    cultivation:
      "Plant in autumn in soil that stays moist through spring, including a heavy border or a meadow that is not cut until midsummer.",
    pests: "Slugs may chew the young shoots. It is otherwise robust.",
    planting: "10 cm deep, in soil that does not bake hard in May",
    plantMonth: 9,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the following late spring",
    heightM: [0.6, 0.9],
  },
  scilla: {
    season: "bulb",
    hardiness: "H6",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: BOTH,
    cultivation:
      "Plant in autumn under deciduous trees or at the front of a border. They naturalise where the summer soil is not bone dry.",
    pests: "Almost trouble-free.",
    planting: "8 cm deep, in small groups",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the first spring",
    heightM: [0.1, 0.2],
  },
  chionodoxa: {
    season: "bulb",
    hardiness: "H6",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: BOTH,
    cultivation:
      "Plant in autumn. Glory of the snow opens early and seeds itself in gravel and under shrubs that are bare in spring.",
    pests: "Almost trouble-free.",
    planting: "8 cm deep",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the first spring and then seeds",
    heightM: [0.1, 0.15],
  },
  eranthis: {
    season: "bulb",
    hardiness: "H6",
    sun: ["partial-sun", "shade"],
    aspect: ["north", "east", "west"],
    soils: ["clay", "loam", "chalk"],
    moisture: ["moist", "well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Soak shrivelled tubers overnight before planting, or move plants in the green. Deciduous shade suits them because summer cover keeps the tubers cool.",
    pests: "Dry tubers fail to grow. Little else troubles them.",
    planting: "5 cm deep after a soak",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Soak and plant",
    maturity: "Flowers the first winter if the tubers were plump",
    heightM: [0.05, 0.1],
  },
  leucojum: {
    season: "bulb",
    hardiness: "H6",
    sun: ["partial-sun", "shade"],
    aspect: ALL_ASPECTS,
    soils: ["clay", "loam"],
    moisture: ["moist", "well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant in autumn in moist, leafy soil. Summer snowflake and spring snowflake both dislike being baked dry.",
    pests: "Slugs. Otherwise robust.",
    planting: "10 cm deep in soil that stays cool",
    plantMonth: 9,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the following season",
    heightM: [0.3, 0.45],
  },
  hyacinthoides: {
    season: "bulb",
    hardiness: "H6",
    sun: ["partial-sun", "shade"],
    aspect: ALL_ASPECTS,
    soils: ["clay", "loam"],
    moisture: ["moist", "well-drained"],
    ph: ["acid", "neutral"],
    exposure: sheltered,
    cultivation:
      "Plant in autumn in deciduous shade and let the seed ripen if you want a colony. Spanish bluebells cross with the native one, so keep them out of wild woodland.",
    pests: "Almost trouble-free once established.",
    planting: "10 cm deep in leafy soil",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the following spring",
    heightM: [0.25, 0.4],
  },
  puschkinia: {
    season: "bulb",
    hardiness: "H6",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: BOTH,
    cultivation:
      "Plant in autumn in a rock garden, gravel, or the front of a border that is sunny in spring.",
    pests: "Almost trouble-free.",
    planting: "8 cm deep",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the first spring",
    heightM: [0.1, 0.15],
  },
  ipheion: {
    season: "bulb",
    hardiness: "H5",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant in autumn in a sheltered, well-drained spot or a pot. The leaves smell of onions if crushed, and the clump dies back for summer.",
    pests: "A hard, wet winter can rot the bulbs. Slugs sometimes eat the flowers.",
    planting: "5 cm deep, and mulch in a cold garden",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the following spring",
    heightM: [0.1, 0.15],
  },
  colchicum: {
    season: "naked",
    hardiness: "H5",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: BOTH,
    cultivation:
      "Plant in late summer, before the naked flowers appear. The broad leaves follow in spring and must be left until they die down. Every part of the plant is poisonous.",
    pests: "Slugs spoil the flowers. Little else eats them.",
    planting: "10 cm deep in August",
    plantMonth: 7,
    plantShift: "autumn",
    plantTitle: "Plant corms",
    maturity: "Flowers the first autumn",
    heightM: [0.15, 0.25],
  },
  crocosmia: {
    season: "bulb",
    hardiness: "H5",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: ["loam", "sand", "clay"],
    moisture: ["well-drained", "moist"],
    ph: ["acid", "neutral"],
    exposure: sheltered,
    cultivation:
      "Plant the corms in spring, or divide a clump then. They flower in late summer and can spread, so lift and thin them when the sheaf of corms is packed tight.",
    pests: "A cold winter after a wet autumn can kill the corms. Otherwise robust.",
    planting: "8 cm deep in spring",
    plantMonth: 3,
    plantShift: "spring",
    plantTitle: "Plant corms",
    maturity: "Flowers the first or second summer",
    heightM: [0.6, 0.9],
  },
  eremurus: {
    season: "bulb",
    hardiness: "H5",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Set the starfish crown on a mound of grit in autumn, with the bud just under the soil. They need full sun, sharp drainage, and a stake once the spike runs up.",
    pests: "Slugs eat the bud as it breaks the surface. Winter wet is the other killer.",
    planting: "on a grit mound, bud just covered",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant crowns",
    maturity: "Flowers the following summer",
    heightM: [1.2, 1.8],
  },
  triteleia: {
    season: "bulb",
    hardiness: "H4",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant in autumn in a warm, free-draining bed or a pot that can stay dryish in winter. The flowers open in early summer after the leaves have often faded.",
    pests: "Winter wet. Otherwise little trouble.",
    planting: "8 cm deep in a sheltered spot",
    plantMonth: 9,
    plantShift: "autumn",
    plantTitle: "Plant corms",
    maturity: "Flowers the following summer",
    heightM: [0.3, 0.5],
  },
  corydalis: {
    season: "bulb",
    hardiness: "H5",
    sun: ["partial-sun", "shade"],
    aspect: ALL_ASPECTS,
    soils: ["loam", "chalk", "clay"],
    moisture: ["moist", "well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant the tubers in autumn in leafy shade. They flower early and vanish underground by summer, so mark the spot.",
    pests: "Drying out in spring. Slugs on the young growth.",
    planting: "5 cm deep in leafy soil",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant tubers",
    maturity: "Flowers the following spring",
    heightM: [0.1, 0.25],
  },
  ornithogalum: {
    season: "bulb",
    hardiness: "H5",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: BOTH,
    cultivation:
      "Plant in autumn. The short star-of-Bethlehem kinds naturalise in grass; taller chincherinchees want a warmer, better-drained bed and a winter mulch.",
    pests: "Almost trouble-free. Sap can irritate skin.",
    planting: "8 cm deep",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the following season",
    heightM: [0.15, 0.4],
  },
  nectaroscordum: {
    season: "bulb",
    hardiness: "H5",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained", "moist"],
    ph: neutral,
    exposure: BOTH,
    cultivation:
      "Plant in autumn and then leave it. Honey garlic seeds freely and the faded bells are as useful as the flowers.",
    pests: "The onion scent deters most animals.",
    planting: "10 cm deep",
    plantMonth: 9,
    plantShift: "autumn",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the following late spring",
    heightM: [0.7, 1],
  },
  galtonia: {
    season: "bulb",
    hardiness: "H4",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant in spring in a warm border. In a cold garden, lift the bulb with the dahlias or cover it with a deep dry mulch.",
    pests: "Slugs on the shoot. Winter wet.",
    planting: "15 cm deep in spring",
    plantMonth: 3,
    plantShift: "spring",
    plantTitle: "Plant bulbs",
    maturity: "Flowers the first late summer",
    heightM: [0.9, 1.2],
  },
  arum: {
    season: "bulb",
    hardiness: "H6",
    sun: ["partial-sun", "shade"],
    aspect: ALL_ASPECTS,
    soils: ["clay", "loam"],
    moisture: ["moist", "well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant the tuber in autumn in shade. The marbled leaves stand through winter, the flower is a pale spathe, and the berries follow. It is poisonous.",
    pests: "Almost trouble-free. It can spread where it is happy.",
    planting: "10 cm deep in leafy shade",
    plantMonth: 8,
    plantShift: "autumn",
    plantTitle: "Plant tubers",
    maturity: "Foliage the first winter, berries later",
    heightM: [0.25, 0.4],
  },
  oxalis: {
    season: "tender",
    hardiness: "H3",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Grow the tubers in a pot or plant them out after frost. Many ornamental oxalis are not hardy, so dry them off and keep them frost-free for winter.",
    pests: "Almost trouble-free in a pot. Do not let the compost stay soggy.",
    planting: "just under the surface after the last frost",
    plantMonth: 4,
    plantShift: "spring",
    plantTitle: "Plant tubers",
    liftMonth: 9,
    maturity: "Flowers the first summer",
    heightM: [0.1, 0.25],
  },
  eucomis: {
    season: "tender",
    hardiness: "H4",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant in spring in full sun and rich, well-drained soil, or in a pot. In cold gardens lift the bulb or give it a thick dry mulch. The pineapple tuft sits on top of the flower spike.",
    pests: "Slugs on the young leaves. Winter wet.",
    planting: "10 cm deep after the last frost",
    plantMonth: 4,
    plantShift: "spring",
    plantTitle: "Plant bulbs",
    liftMonth: 9,
    maturity: "Flowers the first late summer",
    heightM: [0.4, 0.7],
  },
  canna: {
    season: "tender",
    hardiness: "H3",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: ["loam", "clay"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral"],
    exposure: sheltered,
    cultivation:
      "Start the rhizomes in warmth and plant them out after frost, in rich soil and full sun. Water them in summer. Lift and store the rhizome before a hard frost.",
    pests: "Slugs shred the young leaves. A dull summer means fewer flowers.",
    planting: "after the last frost, with the growing tip just covered",
    plantMonth: 4,
    plantShift: "spring",
    plantTitle: "Plant rhizomes",
    liftMonth: 9,
    maturity: "Flowers the first summer",
    heightM: [1, 1.5],
  },
  zantedeschia: {
    season: "tender",
    hardiness: "H3",
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    soils: ["loam", "sand"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral"],
    exposure: sheltered,
    cultivation:
      "The coloured callas are planted in spring and lifted in autumn in most of Britain. Give them sun, water while they are growing, and a dry rest in winter.",
    pests: "Slugs and a soft rot if the crown stays wet in cold weather.",
    planting: "10 cm deep after the last frost",
    plantMonth: 4,
    plantShift: "spring",
    plantTitle: "Plant rhizomes",
    liftMonth: 9,
    maturity: "Flowers the first summer",
    heightM: [0.4, 0.7],
  },
  ixia: {
    season: "tender",
    hardiness: "H3",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant in spring in a warm, sandy bed or a pot. Corn lilies need a hot summer to flower well. Lift the corms before frost.",
    pests: "Winter wet and shade. Otherwise little trouble.",
    planting: "8 cm deep in late spring",
    plantMonth: 4,
    plantShift: "spring",
    plantTitle: "Plant corms",
    liftMonth: 9,
    maturity: "Flowers the first summer in a warm year",
    heightM: [0.3, 0.5],
  },
  crinum: {
    season: "bulb",
    hardiness: "H4",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Plant in spring with the neck of the huge bulb above the soil, against a warm wall. Leave it undisturbed and mulch it in winter.",
    pests: "Slugs on the leaves. A long hard frost can cut the foliage.",
    planting: "with the neck proud of the soil",
    plantMonth: 3,
    plantShift: "spring",
    plantTitle: "Plant bulbs",
    maturity: "May take a year or two before the first flowers",
    heightM: [0.8, 1.2],
  },
  hymenocallis: {
    season: "tender",
    hardiness: "H2",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: drained,
    moisture: ["well-drained"],
    ph: neutral,
    exposure: sheltered,
    cultivation:
      "Grow it in a pot or a warm bed and bring it in before frost. The spidery flowers are scented. Keep the bulb dry and frost-free in winter.",
    pests: "Cold nights and wet compost.",
    planting: "neck just covered, after the last frost",
    plantMonth: 4,
    plantShift: "spring",
    plantTitle: "Plant bulbs",
    liftMonth: 9,
    maturity: "Flowers the first late summer in warmth",
    heightM: [0.4, 0.6],
  },
  hippeastrum: {
    season: "indoor",
    hardiness: "H1c",
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    soils: ["loam", "sand"],
    moisture: ["well-drained"],
    ph: ["neutral"],
    exposure: sheltered,
    cultivation:
      "Pot the bulb with the top third above the compost and grow it on a bright indoor windowsill. Water sparingly until growth shows, then keep it just moist. After flowering, feed the leaves and then give the bulb a dry rest.",
    pests: "Overwatering rots the bulb. Mealybug can hide in the neck.",
    planting: "in a pot only a little wider than the bulb, neck above the compost",
    plantMonth: 10,
    plantShift: "autumn",
    plantTitle: "Pot the bulb",
    maturity: "A spike follows about eight weeks after watering starts",
    heightM: [0.4, 0.6],
  },
};

function metres(value: number): string {
  const text = value.toFixed(2);
  return text.replace(/0$/, "").replace(/\.0$/, "");
}

function monthPhrase(months: readonly number[]): string {
  const sorted = [...months].sort((left, right) => left - right);
  const wraps = sorted.includes(0) && sorted.includes(11);
  const ordered = wraps
    ? [...sorted.filter((month) => month >= 6), ...sorted.filter((month) => month < 6)]
    : sorted;
  const names = ordered.map((month) => MONTH_NAMES[month] ?? "");
  if (names.length === 1) return names[0] ?? "";
  const consecutive = ordered.every(
    (month, index) => index === 0 || month === ((ordered[index - 1] ?? month) + 1) % 12,
  );
  if (!consecutive || names.length === 2) {
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }
  return `${names[0]} to ${names[names.length - 1]}`;
}

function spreadM(profileId: string, height: number): [number, number] {
  const wide = profileId === "dahlia" || profileId === "canna" || profileId === "crinum";
  if (wide) return [Math.round(height * 35) / 100, Math.round(height * 55) / 100];
  if (height <= 0.2) return [0.05, 0.12];
  if (height <= 0.5) return [0.08, 0.15];
  if (height <= 1) return [0.12, 0.25];
  return [0.2, 0.4];
}

function hardinessFor(profile: BulbProfile, flags: string): Hardiness {
  if (profile.season === "tender" || profile.season === "indoor") return profile.hardiness;
  if (flags.includes("n")) return "H4";
  return profile.hardiness;
}

function jobsFor(profile: BulbProfile, name: string, months: readonly number[]): PlantTask[] {
  const tasks: PlantTask[] = [
    {
      month: profile.plantMonth,
      day: 15,
      shift: profile.plantShift,
      title: profile.plantTitle,
      detail: `Plant ${name} ${profile.planting}.`,
    },
  ];
  const last = months[months.length - 1] ?? profile.plantMonth;
  const first = months[0] ?? profile.plantMonth;
  if (profile.season === "indoor") {
    tasks.push({
      month: 4,
      day: 1,
      shift: "none",
      title: "Rest the bulb",
      detail: `Stop watering ${name} and let the pot dry until you want the next spike.`,
    });
    return tasks;
  }
  if (profile.season === "naked") {
    tasks.push({
      month: 4,
      day: 15,
      shift: "none",
      title: "Clear leaves",
      detail: `Remove the leaves of ${name} only once they yellow in late spring.`,
    });
    return tasks;
  }
  if (profile.liftMonth != null) {
    tasks.push({
      month: first,
      day: 20,
      shift: "none",
      title: "Deadhead",
      detail: `Pick off faded flowers of ${name} so the plant keeps making buds.`,
    });
    tasks.push({
      month: profile.liftMonth,
      day: 20,
      shift: "autumn",
      title: "Lift and store",
      detail: `Lift ${name} before a hard frost, dry it, and store it cool and frost-free.`,
    });
    return tasks;
  }
  if (last <= 5) {
    tasks.push({
      month: last,
      day: 20,
      shift: "none",
      title: "Deadhead",
      detail: `Remove faded flowers of ${name} and leave the leaves until they yellow.`,
    });
  } else {
    tasks.push({
      month: Math.min(last + 1, 10),
      day: 10,
      shift: "none",
      title: "Cut back",
      detail: `Cut ${name} back once the leaves have yellowed.`,
    });
  }
  return tasks;
}

interface LookRange {
  from: number;
  to: number;
  foliage?: boolean;
  flower?: string;
  flowerHex?: string;
  scent?: boolean;
}

function flowerRanges(
  months: readonly number[],
  colour: string,
  hex: string,
  scent: boolean,
  lead: boolean,
): LookRange[] {
  const blooming = new Set(months);
  const groups: number[][] = [];
  for (const month of [...blooming].sort((left, right) => left - right)) {
    const current = groups[groups.length - 1];
    if (current && month === (current[current.length - 1] ?? month) + 1) current.push(month);
    else groups.push([month]);
  }
  const ranges: LookRange[] = [];
  for (const group of groups) {
    const start = group[0] ?? 0;
    const leadMonth = start - 1;
    if (lead && leadMonth >= 0 && !blooming.has(leadMonth)) {
      ranges.push({ from: leadMonth, to: leadMonth });
    }
    ranges.push({
      from: start,
      to: group[group.length - 1] ?? start,
      flower: colour,
      flowerHex: hex,
      scent,
      foliage: true,
    });
  }
  return ranges;
}

function looks(
  profile: BulbProfile,
  months: readonly number[],
  colour: string,
  hex: string,
  scent: boolean,
) {
  if (profile.season === "naked") {
    return year([
      { from: 1, to: 4 },
      ...flowerRanges(months, colour, hex, scent, false).map((range) => ({
        ...range,
        foliage: false,
      })),
    ]);
  }
  if (profile.season === "saffron") {
    return year([
      ...flowerRanges(months, colour, hex, scent, true),
      { from: 11, to: 11 },
      { from: 0, to: 2 },
    ]);
  }
  if (profile.season === "indoor") {
    return year([...flowerRanges(months, colour, hex, scent, false), { from: 2, to: 4 }]);
  }
  const ranges = flowerRanges(months, colour, hex, scent, true);
  const last = Math.max(...months);
  if (last + 1 <= 6) ranges.push({ from: last + 1, to: last + 1 });
  return year(ranges);
}

function summaryFor(
  commonName: string,
  profile: BulbProfile,
  height: [number, number],
  months: readonly number[],
  colour: string,
  flags: string,
): string {
  const span =
    height[0] === height[1]
      ? `${metres(height[0])} m`
      : `${metres(height[0])}–${metres(height[1])} m`;
  const bloom =
    colour === "mixed"
      ? " Colours vary in the mixture."
      : colour === "flowers"
        ? ""
        : ` The blooms are ${colour}.`;
  const scent = flags.includes("s") ? " The flowers are scented." : "";
  const deer = flags.includes("d") ? " Deer and rodents usually leave it alone." : "";
  const pollinators = flags.includes("p") ? " It is a useful flower for pollinators." : "";
  const tender = profile.liftMonth != null ? " Lift it before a hard frost and store it dry." : "";
  const indoor =
    profile.season === "indoor"
      ? " Grow it indoors; a flower spike follows about eight weeks after you start watering."
      : "";
  const saffron = profile.season === "saffron" ? " The red stigmas can be dried as saffron." : "";
  return `${commonName} reaches about ${span} and flowers in ${monthPhrase(months)}.${bloom}${scent}${deer}${pollinators}${tender}${indoor}${saffron}`;
}

function parseMonths(value: string): number[] {
  return value
    .split(",")
    .map((part) => Number(part))
    .filter((month) => month >= 0 && month <= 11);
}

export const BULBS: Plant[] = BULB_FACTS.map((fact) => {
  const [
    id,
    commonName,
    scientificName,
    profileId,
    heightMin,
    heightMax,
    monthList,
    colour,
    flowerHex,
    flags,
  ] = fact;
  const profile = PROFILES[profileId];
  if (!profile) throw new Error(`Unknown bulb profile ${profileId}`);
  const height: [number, number] =
    heightMin > 0 && heightMax > 0 ? [heightMin, heightMax] : profile.heightM;
  const months = parseMonths(monthList);
  const scent = flags.includes("s") || profileId === "hyacinthus" || profileId === "acidanthera";
  return plant({
    id,
    scientificName,
    commonName,
    kind: "bulb",
    habit: "bulb",
    summary: summaryFor(commonName, profile, height, months, colour, scent ? `${flags}s` : flags),
    cultivation: profile.cultivation,
    pests: profile.pests,
    soils: profile.soils,
    moisture: profile.moisture,
    ph: profile.ph,
    sun: profile.sun,
    aspect: profile.aspect,
    exposure: profile.exposure,
    hardiness: hardinessFor(profile, flags),
    maturity: profile.maturity,
    heightM: height,
    spreadM: spreadM(profileId, height[1]),
    months: looks(profile, months, colour, flowerHex, scent),
    jobs: jobsFor(profile, commonName, months),
  });
});
