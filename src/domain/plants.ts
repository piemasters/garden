import type { Aspect, Exposure, MonthLook, Plant } from "./types";

const ALL_ASPECTS: Aspect[] = ["north", "east", "south", "west"];
const SUNNY_ASPECTS: Aspect[] = ["east", "south", "west"];
const BOTH: Exposure[] = ["sheltered", "exposed"];

interface LookRange {
  from: number;
  to: number;
  foliage?: boolean;
  flower?: string;
  flowerHex?: string;
  scent?: boolean;
}

function year(ranges: LookRange[], evergreen = false): MonthLook[] {
  const months: MonthLook[] = Array.from({ length: 12 }, () => ({
    foliage: evergreen,
    scent: false,
  }));
  for (const range of ranges) {
    for (let month = range.from; month <= range.to; month += 1) {
      months[month] = {
        foliage: range.foliage ?? true,
        scent: range.scent ?? false,
        flower: range.flower,
        flowerHex: range.flowerHex,
      };
    }
  }
  return months;
}

function plant(record: Plant): Plant {
  return record;
}

export const PLANTS: Plant[] = [
  plant({
    id: "tulipa-olympic-flame",
    scientificName: "Tulipa 'Olympic Flame'",
    commonName: "Olympic Flame tulip",
    kind: "bulb",
    habit: "bulb",
    summary:
      "A tall Darwin hybrid tulip with pale yellow cups brushed in red flame. It flowers in mid to late spring and then dies back cleanly.",
    cultivation:
      "Plant bulbs 10–15 cm deep in autumn, in fertile soil that does not sit wet in winter. Shelter the stems from strong wind and let the leaves yellow before you remove them.",
    pests: "Slugs, aphids and squirrels can damage bulbs and buds. Poor drainage invites bulb rot.",
    soils: ["chalk", "loam", "sand"],
    moisture: ["well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H6",
    maturity: "Flowers the first spring after planting",
    heightM: [0.4, 0.5],
    spreadM: [0.1, 0.15],
    months: year([
      { from: 1, to: 2 },
      { from: 3, to: 4, flower: "yellow flamed red", flowerHex: "#e2b33a" },
    ]),
    jobs: [
      {
        month: 9,
        day: 15,
        shift: "autumn",
        title: "Plant bulbs",
        detail: "Set Olympic Flame bulbs 10–15 cm deep, point upwards, in a well-drained bed.",
      },
      {
        month: 4,
        day: 10,
        shift: "none",
        title: "Deadhead",
        detail: "Snap off faded flowers so the bulb is not spent on seed, and keep the leaves.",
      },
      {
        month: 5,
        day: 20,
        shift: "none",
        title: "Clear foliage",
        detail: "Remove leaves only once they yellow. Lift bulbs if the bed stays wet in summer.",
      },
    ],
  }),
  plant({
    id: "tulipa-queen-of-night",
    scientificName: "Tulipa 'Queen of Night'",
    commonName: "Queen of Night tulip",
    kind: "bulb",
    habit: "bulb",
    summary:
      "A single late tulip with deep maroon, almost black, cups. It is one of the last tulips to flower and looks strongest against pale foliage.",
    cultivation:
      "Treat it as a spring display bulb: plant deeply in autumn and do not expect every bulb to return with the same strength the next year.",
    pests: "Squirrels dig newly planted bulbs. Tulip fire can mark leaves in a wet spring.",
    soils: ["chalk", "loam", "sand"],
    moisture: ["well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H6",
    maturity: "Flowers the first spring after planting",
    heightM: [0.5, 0.6],
    spreadM: [0.1, 0.15],
    months: year([
      { from: 2, to: 3 },
      { from: 4, to: 4, flower: "maroon", flowerHex: "#3a1d2b" },
    ]),
    jobs: [
      {
        month: 10,
        day: 1,
        shift: "autumn",
        title: "Plant bulbs",
        detail: "Plant Queen of Night about 15 cm deep once the soil has cooled.",
      },
      {
        month: 4,
        day: 20,
        shift: "none",
        title: "Deadhead",
        detail: "Remove spent maroon cups and leave the foliage to feed the bulb.",
      },
    ],
  }),
  plant({
    id: "narcissus-tete-a-tete",
    scientificName: "Narcissus 'Tête-à-Tête'",
    commonName: "Tête-à-Tête daffodil",
    kind: "bulb",
    habit: "bulb",
    summary:
      "A short, early daffodil with one or two golden flowers on each stem. It clumps up reliably and suits the front of a bed or a pot.",
    cultivation:
      "Plant in autumn at about twice the depth of the bulb. It naturalises in soil that is moist in spring and drier once the leaves die down.",
    pests:
      "Narcissus fly can hollow bulbs. Congested clumps flower less and can be split after the leaves fade.",
    soils: ["chalk", "clay", "loam", "sand"],
    moisture: ["well-drained", "moist"],
    ph: ["acid", "neutral", "alkaline"],
    sun: ["full-sun", "partial-sun"],
    aspect: ALL_ASPECTS,
    exposure: BOTH,
    hardiness: "H6",
    maturity: "Flowers the first spring, then clumps over 2–3 years",
    heightM: [0.15, 0.2],
    spreadM: [0.1, 0.15],
    months: year([
      { from: 1, to: 1 },
      { from: 2, to: 3, flower: "golden yellow", flowerHex: "#f0c419" },
    ]),
    jobs: [
      {
        month: 8,
        day: 20,
        shift: "autumn",
        title: "Plant bulbs",
        detail: "Plant Tête-à-Tête about 10 cm deep. Water once if the soil is dust-dry.",
      },
      {
        month: 4,
        day: 15,
        shift: "none",
        title: "Leave the leaves",
        detail:
          "Do not tie or cut the foliage until it yellows, usually six weeks after flowering.",
      },
    ],
  }),
  plant({
    id: "narcissus-thalia",
    scientificName: "Narcissus 'Thalia'",
    commonName: "Thalia daffodil",
    kind: "bulb",
    habit: "bulb",
    summary:
      "A white multi-headed daffodil with a light scent and nodding flowers in mid-spring. It is taller than the miniature varieties and sits well among perennials.",
    cultivation:
      "Plant in autumn in sun or light shade. It prefers soil that drains in winter but does not bake hard before the leaves have died back.",
    pests:
      "Slugs may rasp emerging shoots. Blind buds usually mean the clump needs more light or splitting.",
    soils: ["chalk", "loam", "sand"],
    moisture: ["well-drained", "moist"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H6",
    maturity: "Flowers the first spring after planting",
    heightM: [0.3, 0.4],
    spreadM: [0.1, 0.15],
    months: year([
      { from: 2, to: 2 },
      { from: 3, to: 4, flower: "white", flowerHex: "#f4f1e6", scent: true },
    ]),
    jobs: [
      {
        month: 9,
        day: 1,
        shift: "autumn",
        title: "Plant bulbs",
        detail:
          "Plant Thalia 12 cm deep in groups of five or more so the white flowers read as a drift.",
      },
      {
        month: 4,
        day: 25,
        shift: "none",
        title: "Deadhead",
        detail: "Take off faded heads. The scent is strongest on a still, warm day.",
      },
    ],
  }),
  plant({
    id: "allium-purple-sensation",
    scientificName: "Allium 'Purple Sensation'",
    commonName: "Purple Sensation allium",
    kind: "bulb",
    habit: "bulb",
    summary:
      "A drumstick allium with metallic purple globes on bare stems in late spring. The leaves appear early and often look tired by the time the flower opens.",
    cultivation:
      "Plant bulbs deeply in autumn in soil that drains freely. Hide the fading leaves behind the front edge of the border.",
    pests: "Usually trouble-free. Waterlogged soil rots the bulbs.",
    soils: ["chalk", "loam", "sand"],
    moisture: ["well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: BOTH,
    hardiness: "H6",
    maturity: "Flowers the first year, then multiplies slowly",
    heightM: [0.8, 1],
    spreadM: [0.1, 0.15],
    months: year([
      { from: 2, to: 3 },
      { from: 4, to: 5, flower: "purple", flowerHex: "#6b3fa0" },
    ]),
    jobs: [
      {
        month: 9,
        day: 20,
        shift: "autumn",
        title: "Plant bulbs",
        detail:
          "Plant Purple Sensation 12–15 cm deep. A handful of grit under the bulb helps on heavy soil.",
      },
      {
        month: 5,
        day: 15,
        shift: "none",
        title: "Leave seedheads",
        detail: "The dried globes can stay for structure, or cut them before the seed scatters.",
      },
    ],
  }),
  plant({
    id: "crocus-tommasinianus",
    scientificName: "Crocus tommasinianus",
    commonName: "Early crocus",
    kind: "bulb",
    habit: "bulb",
    summary:
      "A slender late-winter crocus in pale lilac, happier in grass and gravel than the fat Dutch hybrids. It spreads by seed where it is left alone.",
    cultivation:
      "Plant corms in early autumn, 8 cm deep, where winter sun can reach the flowers. Avoid deep shade and waterlogged lawns.",
    pests: "Mice and squirrels take corms. Flowers close in dull weather and open in sun.",
    soils: ["chalk", "loam", "sand"],
    moisture: ["well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: BOTH,
    hardiness: "H6",
    maturity: "Flowers the first late winter",
    heightM: [0.08, 0.1],
    spreadM: [0.05, 0.1],
    months: year([
      { from: 0, to: 0 },
      { from: 1, to: 2, flower: "lilac", flowerHex: "#b9a0d4" },
    ]),
    jobs: [
      {
        month: 8,
        day: 15,
        shift: "autumn",
        title: "Plant corms",
        detail:
          "Plant early crocus as soon as corms are available so the roots establish before winter.",
      },
      {
        month: 2,
        day: 20,
        shift: "none",
        title: "Let them seed",
        detail: "Leave the narrow leaves until they wither if you want the colony to thicken.",
      },
    ],
  }),
  plant({
    id: "galanthus-nivalis",
    scientificName: "Galanthus nivalis",
    commonName: "Common snowdrop",
    kind: "bulb",
    habit: "bulb",
    summary:
      "The familiar winter snowdrop, with nodding white bells and a green mark on the inner petals. It does best in soil that stays cool and leafy.",
    cultivation:
      "Plant in the green after flowering, or as dry bulbs in autumn if they have not dried out. Light shade under deciduous shrubs suits them.",
    pests: "Squirrels disturb fresh plantings. Congested clumps can be split as the flowers fade.",
    soils: ["clay", "loam", "chalk"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["partial-sun", "shade"],
    aspect: ["north", "east", "west"],
    exposure: ["sheltered"],
    hardiness: "H5",
    maturity: "Establishes over 1–2 years",
    heightM: [0.1, 0.15],
    spreadM: [0.1, 0.15],
    months: year([
      { from: 0, to: 1, flower: "white", flowerHex: "#f7f7f2" },
      { from: 2, to: 3 },
    ]),
    jobs: [
      {
        month: 2,
        day: 1,
        shift: "spring",
        title: "Move in the green",
        detail:
          "Split and replant snowdrops just after flowering, while the leaves are still green.",
      },
      {
        month: 9,
        day: 1,
        shift: "autumn",
        title: "Plant dry bulbs",
        detail: "If you plant dry bulbs, do it promptly in early autumn and water them in.",
      },
    ],
  }),
  plant({
    id: "hyacinthoides-non-scripta",
    scientificName: "Hyacinthoides non-scripta",
    commonName: "English bluebell",
    kind: "bulb",
    habit: "bulb",
    summary:
      "A woodland bulb with nodding, violet-blue bells on one side of an arching stem, and a light scent. It wants spring light and summer shade.",
    cultivation:
      "Plant bulbs in autumn under deciduous trees or on the shady side of a shrub. Keep it apart from Spanish bluebell if you want this form to stay true.",
    pests: "Trampling breaks the brittle leaves. It is otherwise undemanding in moist, leafy soil.",
    soils: ["clay", "loam", "chalk"],
    moisture: ["moist"],
    ph: ["acid", "neutral"],
    sun: ["partial-sun", "shade"],
    aspect: ["north", "east", "west"],
    exposure: ["sheltered"],
    hardiness: "H6",
    maturity: "A colony builds over several years",
    heightM: [0.2, 0.4],
    spreadM: [0.1, 0.2],
    months: year([
      { from: 1, to: 2 },
      { from: 3, to: 4, flower: "violet-blue", flowerHex: "#3f4fbf", scent: true },
    ]),
    jobs: [
      {
        month: 9,
        day: 10,
        shift: "autumn",
        title: "Plant bulbs",
        detail: "Plant English bluebells 8–10 cm deep where the soil will not be regularly dug.",
      },
      {
        month: 5,
        day: 20,
        shift: "none",
        title: "Let seed fall",
        detail:
          "Allow seed pods to ripen if you want the drift to spread. Clear leaves once they yellow.",
      },
    ],
  }),
  plant({
    id: "iris-reticulata",
    scientificName: "Iris reticulata",
    commonName: "Reticulata iris",
    kind: "bulb",
    habit: "bulb",
    summary:
      "A small late-winter iris with violet falls and a yellow signal, often lightly scented. It is best in a raised bed, gravel, or a pot that dries in summer.",
    cultivation:
      "Plant 8 cm deep in autumn. Wet summer soil is the usual reason bulbs fail to return.",
    pests: "Ink disease spots the bulbs. Birds sometimes pull at the flowers.",
    soils: ["chalk", "loam", "sand"],
    moisture: ["well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: BOTH,
    hardiness: "H7",
    maturity: "Flowers the first late winter",
    heightM: [0.1, 0.15],
    spreadM: [0.05, 0.1],
    months: year([
      { from: 1, to: 2, flower: "violet", flowerHex: "#4c3d8f", scent: true },
      { from: 3, to: 3 },
    ]),
    jobs: [
      {
        month: 9,
        day: 5,
        shift: "autumn",
        title: "Plant bulbs",
        detail:
          "Plant reticulata iris in gritty soil, 8 cm deep, where summer rain can drain away.",
      },
      {
        month: 3,
        day: 15,
        shift: "none",
        title: "Keep them dry later",
        detail: "After the narrow leaves fade, avoid heavy summer watering over the bulbs.",
      },
    ],
  }),
  plant({
    id: "camassia-leichtlinii",
    scientificName: "Camassia leichtlinii",
    commonName: "Quamash",
    kind: "bulb",
    habit: "bulb",
    summary:
      "A late-spring bulb with spires of starry blue or cream flowers. It likes moisture while it is growing and will sit in heavier soil than a tulip.",
    cultivation:
      "Plant 10 cm deep in autumn. It suits a damp border or a meadow that is not cut until midsummer.",
    pests: "Slugs may chew young shoots. It is otherwise robust.",
    soils: ["clay", "loam"],
    moisture: ["moist", "well-drained"],
    ph: ["acid", "neutral"],
    sun: ["full-sun", "partial-sun"],
    aspect: ALL_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H4",
    maturity: "Flowers the following late spring",
    heightM: [0.7, 0.9],
    spreadM: [0.1, 0.2],
    months: year([
      { from: 2, to: 3 },
      { from: 4, to: 5, flower: "blue", flowerHex: "#4d6ec4" },
    ]),
    jobs: [
      {
        month: 9,
        day: 15,
        shift: "autumn",
        title: "Plant bulbs",
        detail: "Plant quamash 10 cm deep in soil that stays moist through spring.",
      },
      {
        month: 6,
        day: 10,
        shift: "none",
        title: "Cut back",
        detail: "Remove faded spikes and yellowing leaves once the clump has finished.",
      },
    ],
  }),
  plant({
    id: "lilium-regale",
    scientificName: "Lilium regale",
    commonName: "Regal lily",
    kind: "bulb",
    habit: "bulb",
    summary:
      "A scented July lily with white trumpets, a yellow throat and a pink reverse. The stems need staking in exposed gardens, and the base prefers shade from neighbouring leaves.",
    cultivation:
      "Plant bulbs in autumn or early spring, 15 cm deep, with grit if the soil is heavy. A late frost can nip the shoot tips, so a sheltered spot is safer.",
    pests: "Lily beetle must be picked off by hand. Slugs take the emerging shoots.",
    soils: ["loam", "sand", "chalk"],
    moisture: ["well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H5",
    maturity: "Flowers in the first or second summer",
    heightM: [0.9, 1.2],
    spreadM: [0.2, 0.3],
    months: year([
      { from: 3, to: 5 },
      { from: 6, to: 6, flower: "white, pink reverse", flowerHex: "#f6f1e4", scent: true },
      { from: 7, to: 7 },
    ]),
    jobs: [
      {
        month: 9,
        day: 25,
        shift: "autumn",
        title: "Plant bulbs",
        detail:
          "Plant regal lilies 15 cm deep. Put a cane in at planting so you do not spear the bulb later.",
      },
      {
        month: 3,
        day: 20,
        shift: "spring",
        title: "Watch for beetle",
        detail: "From spring, check leaves for red lily beetles and their dark grubs.",
      },
      {
        month: 6,
        day: 20,
        shift: "none",
        title: "Stake and deadhead",
        detail: "Tie stems before the trumpets open, and remove faded flowers.",
      },
    ],
  }),
  plant({
    id: "eranthis-hyemalis",
    scientificName: "Eranthis hyemalis",
    commonName: "Winter aconite",
    kind: "bulb",
    habit: "bulb",
    summary:
      "A yellow winter flower sitting on a green ruff of leaves, often out with the snowdrops. It spreads where the soil is leafy and left undisturbed.",
    cultivation:
      "Plant tubers in autumn after a soak, or move plants in the green. Deciduous shade is ideal because summer cover keeps the tubers cool.",
    pests: "Dry, shrivelled tubers fail to grow. Little else troubles it.",
    soils: ["clay", "loam", "chalk"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["partial-sun", "shade"],
    aspect: ["north", "east", "west"],
    exposure: ["sheltered"],
    hardiness: "H6",
    maturity: "Flowers the first winter if the tubers were plump",
    heightM: [0.05, 0.1],
    spreadM: [0.1, 0.15],
    months: year([
      { from: 0, to: 1, flower: "yellow", flowerHex: "#e6c229" },
      { from: 2, to: 3 },
    ]),
    jobs: [
      {
        month: 8,
        day: 25,
        shift: "autumn",
        title: "Soak and plant",
        detail: "Soak shrivelled aconite tubers overnight and plant them 5 cm deep.",
      },
      {
        month: 2,
        day: 10,
        shift: "spring",
        title: "Split in the green",
        detail: "Lift and divide flowering clumps if you want to start a new patch.",
      },
    ],
  }),
  plant({
    id: "rosa-gertrude-jekyll",
    scientificName: "Rosa 'Gertrude Jekyll'",
    commonName: "Gertrude Jekyll rose",
    kind: "plant",
    habit: "shrub",
    summary:
      "A shrub rose with rich pink, strongly scented rosettes in flushes from early summer into autumn. It can be grown as a bush or trained on a warm wall.",
    cultivation:
      "Plant bare-root in the dormant season, or container plants in any mild month. Give it sun, an airy site, and a mulch in spring. Prune in late winter to an open framework.",
    pests:
      "Aphids, blackspot and mildew appear in still or overcrowded spots. Pick off badly marked leaves.",
    soils: ["clay", "loam", "chalk"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H6",
    maturity: "Flowers well from the second summer",
    heightM: [1.2, 1.8],
    spreadM: [1, 1.2],
    months: year([
      { from: 3, to: 4 },
      { from: 5, to: 8, flower: "deep pink", flowerHex: "#d4567c", scent: true },
      { from: 9, to: 9 },
    ]),
    jobs: [
      {
        month: 1,
        day: 15,
        shift: "spring",
        title: "Prune",
        detail:
          "Shorten Gertrude Jekyll by about a third and take out dead or crossing wood while it is dormant.",
      },
      {
        month: 2,
        day: 20,
        shift: "spring",
        title: "Feed and mulch",
        detail:
          "Spread a rose feed and a layer of compost around the base, keeping it off the stems.",
      },
      {
        month: 6,
        day: 15,
        shift: "none",
        title: "Deadhead",
        detail: "Cut faded clusters back to a leaf so the next flush is encouraged.",
      },
    ],
  }),
  plant({
    id: "lavandula-angustifolia",
    scientificName: "Lavandula angustifolia",
    commonName: "English lavender",
    kind: "plant",
    habit: "shrub",
    summary:
      "A grey evergreen shrub with scented purple spikes in summer. It wants sun and sharp drainage, and it dislikes a wet clay winter.",
    cultivation:
      "Plant in spring in poor, gritty soil. Shear off the faded flower stalks and a little leafy growth after flowering, but do not cut into old bare wood.",
    pests: "Rosemary beetle can notch the leaves. Root rot follows winter wet.",
    soils: ["chalk", "loam", "sand"],
    moisture: ["well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: BOTH,
    hardiness: "H5",
    maturity: "A useful shrub in 1–2 years",
    heightM: [0.4, 0.6],
    spreadM: [0.5, 0.7],
    months: year([{ from: 5, to: 7, flower: "purple", flowerHex: "#7a64b8", scent: true }], true),
    jobs: [
      {
        month: 3,
        day: 15,
        shift: "spring",
        title: "Plant",
        detail: "Set young lavender out in spring so the roots establish before winter wet.",
      },
      {
        month: 7,
        day: 25,
        shift: "none",
        title: "Shear after flowering",
        detail: "Trim faded spikes and the soft tips. Leave some green leaf on each stem.",
      },
    ],
  }),
  plant({
    id: "hydrangea-macrophylla",
    scientificName: "Hydrangea macrophylla",
    commonName: "Mophead hydrangea",
    kind: "plant",
    habit: "shrub",
    summary:
      "A rounded shrub with large summer flowerheads, blue on acid soil and pinker on alkaline soil. It likes moisture, and protection from midday scorch and cold wind.",
    cultivation:
      "Plant in autumn or spring and water through the first summers. In spring, cut out one or two of the oldest stems at the base and deadhead back to a fat bud.",
    pests:
      "Capsid bugs distort young leaves. Frost can brown the expanding buds on an exposed site.",
    soils: ["clay", "loam"],
    moisture: ["moist"],
    ph: ["acid", "neutral"],
    sun: ["partial-sun", "full-sun"],
    aspect: ["east", "west", "north"],
    exposure: ["sheltered"],
    hardiness: "H5",
    maturity: "Flowers reliably from the second year",
    heightM: [1, 1.5],
    spreadM: [1, 1.5],
    months: year([
      { from: 3, to: 5 },
      { from: 6, to: 8, flower: "pink or blue", flowerHex: "#7e8fd4" },
      { from: 9, to: 9 },
    ]),
    jobs: [
      {
        month: 3,
        day: 10,
        shift: "spring",
        title: "Prune lightly",
        detail:
          "Remove dead flowerheads down to a strong pair of buds, and take out a few old stems.",
      },
      {
        month: 6,
        day: 5,
        shift: "none",
        title: "Water in dry spells",
        detail: "Soak the root area in a dry June so the flowerheads do not flop.",
      },
    ],
  }),
  plant({
    id: "salvia-rosmarinus",
    scientificName: "Salvia rosmarinus",
    commonName: "Rosemary",
    kind: "plant",
    habit: "shrub",
    summary:
      "An evergreen culinary shrub with needle leaves and small pale-blue flowers from late winter into spring. It needs sun and will not tolerate sitting in cold wet clay.",
    cultivation:
      "Plant in spring against a warm wall if your garden is exposed. Trim after flowering to keep it dense. Replace woody, bare plants rather than cutting them hard.",
    pests: "Rosemary beetle is the main pest. Cold wet winters kill more plants than frost alone.",
    soils: ["chalk", "loam", "sand"],
    moisture: ["well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: BOTH,
    hardiness: "H4",
    maturity: "Useful within a year",
    heightM: [0.8, 1.5],
    spreadM: [0.8, 1.2],
    months: year(
      [{ from: 2, to: 4, flower: "pale blue", flowerHex: "#9eb7d8", scent: true }],
      true,
    ),
    jobs: [
      {
        month: 3,
        day: 25,
        shift: "spring",
        title: "Plant",
        detail:
          "Plant rosemary in spring, adding grit on heavier soil, in the sunniest part of the garden.",
      },
      {
        month: 4,
        day: 20,
        shift: "none",
        title: "Trim after flowering",
        detail: "Shear the soft growth lightly once the blue flowers fade.",
      },
    ],
  }),
  plant({
    id: "geranium-rozanne",
    scientificName: "Geranium 'Rozanne'",
    commonName: "Rozanne cranesbill",
    kind: "plant",
    habit: "clump",
    summary:
      "A long-flowering hardy geranium with violet-blue saucers and a white eye, from early summer until the frosts. It sprawls and knits the front of a border together.",
    cultivation:
      "Plant in spring or autumn in any reasonable soil. Shear the mat once in midsummer if it gets leggy and it will flower again.",
    pests:
      "Sawfly larvae can strip leaves. This cultivar is usually vigorous enough to grow through the damage.",
    soils: ["chalk", "clay", "loam", "sand"],
    moisture: ["well-drained", "moist"],
    ph: ["acid", "neutral", "alkaline"],
    sun: ["full-sun", "partial-sun"],
    aspect: ALL_ASPECTS,
    exposure: BOTH,
    hardiness: "H7",
    maturity: "Fills its space in the first summer",
    heightM: [0.4, 0.6],
    spreadM: [0.6, 0.8],
    months: year([
      { from: 3, to: 4 },
      { from: 5, to: 9, flower: "violet-blue", flowerHex: "#4f62c8" },
    ]),
    jobs: [
      {
        month: 3,
        day: 5,
        shift: "spring",
        title: "Cut back old stems",
        detail: "Clear the dead top growth of Rozanne before the new shoots cover it.",
      },
      {
        month: 6,
        day: 25,
        shift: "none",
        title: "Shear for a second flush",
        detail:
          "If the clump looks tired in July, cut it back and water. Fresh leaves and flowers follow.",
      },
    ],
  }),
  plant({
    id: "hosta-frances-williams",
    scientificName: "Hosta 'Frances Williams'",
    commonName: "Frances Williams hosta",
    kind: "plant",
    habit: "clump",
    summary:
      "A large hosta with blue-green leaves edged in yellow-green, and pale lilac bells in summer. It is a shade plant, and the leaves scorch in hot sun.",
    cultivation:
      "Plant in spring in moisture-retentive soil improved with leafmould. Slug protection matters most as the shoots emerge.",
    pests: "Slugs and snails shred the leaves. Vine weevil can attack plants in pots.",
    soils: ["clay", "loam"],
    moisture: ["moist"],
    ph: ["acid", "neutral"],
    sun: ["shade", "partial-sun"],
    aspect: ["north", "east", "west"],
    exposure: ["sheltered"],
    hardiness: "H7",
    maturity: "A full clump in 2–3 years",
    heightM: [0.5, 0.7],
    spreadM: [0.8, 1.1],
    months: year([
      { from: 3, to: 5 },
      { from: 6, to: 7, flower: "pale lilac", flowerHex: "#c7c0de" },
      { from: 8, to: 9 },
    ]),
    jobs: [
      {
        month: 3,
        day: 1,
        shift: "spring",
        title: "Protect new shoots",
        detail: "Start slug control as Frances Williams noses through, before the leaves unroll.",
      },
      {
        month: 10,
        day: 15,
        shift: "autumn",
        title: "Clear collapsed leaves",
        detail: "Cut the mushy autumn leaves away so slugs have fewer places to shelter.",
      },
    ],
  }),
  plant({
    id: "salvia-nemorosa-caradonna",
    scientificName: "Salvia nemorosa 'Caradonna'",
    commonName: "Caradonna salvia",
    kind: "plant",
    habit: "clump",
    summary:
      "A border perennial with dark stems and violet flower spikes, repeating if it is cut back. It wants sun and is happier in ordinary soil than in a rich, wet one.",
    cultivation:
      "Plant in spring. After the first flowering, shear the spikes off and it will send another flush. Leave the last stems through winter for structure.",
    pests: "Slugs may graze young growth. It is otherwise an easy perennial.",
    soils: ["chalk", "loam", "sand"],
    moisture: ["well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: BOTH,
    hardiness: "H7",
    maturity: "Flowers the first summer",
    heightM: [0.4, 0.5],
    spreadM: [0.3, 0.4],
    months: year([
      { from: 3, to: 4 },
      { from: 5, to: 8, flower: "violet", flowerHex: "#5b3d9a" },
    ]),
    jobs: [
      {
        month: 2,
        day: 25,
        shift: "spring",
        title: "Cut to the base",
        detail: "Remove the old dark stems of Caradonna as new leaves appear at ground level.",
      },
      {
        month: 6,
        day: 20,
        shift: "none",
        title: "Shear the first flush",
        detail: "Cut faded spikes back to the leaves for flowers later in summer.",
      },
    ],
  }),
  plant({
    id: "digitalis-purpurea",
    scientificName: "Digitalis purpurea",
    commonName: "Foxglove",
    kind: "plant",
    habit: "clump",
    summary:
      "A biennial with a rosette of soft leaves and, in its second year, a tall spire of pink-purple bells. It sows itself in light shade. All parts are poisonous.",
    cultivation:
      "Sow in early summer, or plant rosettes in autumn where they are to flower the next year. Let a few spikes set seed if you want it to continue.",
    pests:
      "Moth caterpillars can mark the leaves. Little else stops it in a moist, partly shaded spot.",
    soils: ["clay", "loam", "sand"],
    moisture: ["moist", "well-drained"],
    ph: ["acid", "neutral"],
    sun: ["partial-sun", "shade"],
    aspect: ["north", "east", "west"],
    exposure: ["sheltered"],
    hardiness: "H6",
    maturity: "Flowers in the second year from seed",
    heightM: [1.2, 1.8],
    spreadM: [0.4, 0.5],
    months: year([
      { from: 2, to: 4 },
      { from: 5, to: 6, flower: "pink-purple", flowerHex: "#c46b93" },
      { from: 7, to: 9 },
    ]),
    jobs: [
      {
        month: 5,
        day: 20,
        shift: "none",
        title: "Sow seed",
        detail: "Sow foxglove thinly outdoors in late spring. Transplant the rosettes in autumn.",
      },
      {
        month: 6,
        day: 30,
        shift: "none",
        title: "Stake tall spikes",
        detail:
          "A single cane keeps the flower stem upright on a windy site. Leave one spike to seed.",
      },
    ],
  }),
  plant({
    id: "astrantia-major",
    scientificName: "Astrantia major",
    commonName: "Masterwort",
    kind: "plant",
    habit: "clump",
    summary:
      "A clump-forming perennial with pincushion flowers in greenish white or dusty pink, held above divided leaves. It likes a cool root run and will not enjoy a hot dry bank.",
    cultivation:
      "Plant in autumn or spring and water during the first summer. Cut faded stems to encourage a later scatter of flowers, and divide every few years.",
    pests: "Slugs can mark young leaves. Powdery mildew shows up if the plant is starved of water.",
    soils: ["clay", "loam"],
    moisture: ["moist"],
    ph: ["neutral", "alkaline"],
    sun: ["partial-sun", "full-sun"],
    aspect: ALL_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H7",
    maturity: "Flowers from the first or second summer",
    heightM: [0.6, 0.9],
    spreadM: [0.4, 0.5],
    months: year([
      { from: 3, to: 4 },
      { from: 5, to: 7, flower: "greenish pink", flowerHex: "#d7b3b8" },
      { from: 8, to: 8 },
    ]),
    jobs: [
      {
        month: 2,
        day: 20,
        shift: "spring",
        title: "Mulch",
        detail: "Mulch masterwort while the soil is damp so the clump does not dry out in June.",
      },
      {
        month: 7,
        day: 5,
        shift: "none",
        title: "Cut faded stems",
        detail: "Remove spent flower stems to tidy the clump and prompt a smaller second show.",
      },
    ],
  }),
  plant({
    id: "helleborus-x-hybridus",
    scientificName: "Helleborus × hybridus",
    commonName: "Lenten rose",
    kind: "plant",
    habit: "clump",
    summary:
      "An evergreen perennial that flowers in late winter, with nodding bowls in white, pink, plum or spotted forms. It prefers shade and soil that does not dry out in summer.",
    cultivation:
      "Plant in autumn or spring and leave the crown undisturbed. In midwinter, cut away the old leaves so the flowers are visible and disease has less to linger on.",
    pests: "Aphids cluster under the leaves. Leaf spot is reduced by removing old foliage.",
    soils: ["clay", "loam", "chalk"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["shade", "partial-sun"],
    aspect: ["north", "east", "west"],
    exposure: ["sheltered"],
    hardiness: "H7",
    maturity: "Flowers from the second winter",
    heightM: [0.4, 0.5],
    spreadM: [0.4, 0.5],
    months: year([{ from: 0, to: 2, flower: "white to plum", flowerHex: "#efe8df" }], true),
    jobs: [
      {
        month: 0,
        day: 10,
        shift: "none",
        title: "Remove old leaves",
        detail:
          "Cut last year's hellebore leaves away as the flower buds rise, and bin spotted foliage.",
      },
      {
        month: 4,
        day: 1,
        shift: "none",
        title: "Mulch",
        detail: "Feed with compost after flowering. Do not bury the crown.",
      },
    ],
  }),
  plant({
    id: "syringa-vulgaris",
    scientificName: "Syringa vulgaris",
    commonName: "Common lilac",
    kind: "plant",
    habit: "shrub",
    summary:
      "A large deciduous shrub with cones of scented lilac, white or purple flowers in late spring. It needs a cold winter and a sunny, open position to flower freely.",
    cultivation:
      "Plant in the dormant season. Prune, if you must, straight after flowering, because next year's buds form on the summer growth. Remove suckers from grafted plants.",
    pests: "Lilac blight blackens young shoots in a wet spring. Cut those shoots out.",
    soils: ["chalk", "clay", "loam"],
    moisture: ["well-drained", "moist"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: BOTH,
    hardiness: "H6",
    maturity: "Flowers well after 2–3 years",
    heightM: [3, 4],
    spreadM: [2, 3],
    months: year([
      { from: 3, to: 3 },
      { from: 4, to: 4, flower: "lilac", flowerHex: "#b79ad4", scent: true },
      { from: 5, to: 9 },
    ]),
    jobs: [
      {
        month: 5,
        day: 10,
        shift: "none",
        title: "Prune after flowering",
        detail:
          "Shorten spent lilac flower stems immediately, before the shrub sets next year's buds.",
      },
      {
        month: 10,
        day: 1,
        shift: "autumn",
        title: "Plant",
        detail:
          "Plant a container-grown or bare-root lilac in autumn, at the same depth it grew before.",
      },
    ],
  }),
  plant({
    id: "malus-evereste",
    scientificName: "Malus 'Evereste'",
    commonName: "Evereste crab apple",
    kind: "plant",
    habit: "tree",
    summary:
      "A small crab apple with pink-budded white blossom and orange-red fruit that hangs on into winter. It is a good single tree for a modest UK garden.",
    cultivation:
      "Plant in the dormant season in any fertile soil, staking a young tree for two years. Prune only to remove dead, rubbing or badly placed wood in winter.",
    pests:
      "Aphids curl young leaves. Scab can mark fruit in a wet year. Birds take some of the crabs.",
    soils: ["chalk", "clay", "loam", "sand"],
    moisture: ["moist", "well-drained"],
    ph: ["acid", "neutral", "alkaline"],
    sun: ["full-sun", "partial-sun"],
    aspect: ALL_ASPECTS,
    exposure: BOTH,
    hardiness: "H6",
    maturity: "Blossom and fruit from about the third year",
    heightM: [4, 5],
    spreadM: [3, 4],
    months: year([
      { from: 3, to: 4, flower: "white, pink in bud", flowerHex: "#f7e4ea" },
      { from: 5, to: 8 },
      { from: 9, to: 11, flower: "orange-red fruit", flowerHex: "#d4652f" },
    ]),
    jobs: [
      {
        month: 10,
        day: 20,
        shift: "autumn",
        title: "Plant the tree",
        detail: "Plant Evereste in autumn, no deeper than the nursery mark, and stake it low.",
      },
      {
        month: 1,
        day: 20,
        shift: "none",
        title: "Winter prune",
        detail:
          "Take out dead and crossing branches while the tree is dormant. Keep the cut light.",
      },
      {
        month: 7,
        day: 1,
        shift: "none",
        title: "Water a young tree",
        detail: "In a dry July, water a tree planted within the last two years.",
      },
    ],
  }),
  plant({
    id: "lathyrus-odoratus",
    scientificName: "Lathyrus odoratus",
    commonName: "Sweet pea",
    kind: "seed",
    habit: "annual",
    summary:
      "A scented annual climber with flowers in pinks, purples and whites through summer, if you keep cutting them. It wants a cool root, sun on the flowers, and something to climb.",
    cultivation:
      "Sow in autumn under cover in mild gardens, or in late winter indoors. Plant out in spring beside pea sticks or netting, and water in dry spells.",
    pests: "Slugs shred seedlings. Pollen beetles sit in the flowers. Mice take outdoor sowings.",
    soils: ["clay", "loam"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H3",
    maturity: "Flowers about 12–14 weeks after a spring sowing",
    heightM: [1.8, 2.2],
    spreadM: [0.3, 0.4],
    months: year([
      { from: 4, to: 4 },
      { from: 5, to: 8, flower: "pink and purple", flowerHex: "#d9789b", scent: true },
    ]),
    jobs: [
      {
        month: 9,
        day: 20,
        shift: "autumn",
        title: "Sow in pots",
        detail:
          "In a mild garden, sow sweet peas in deep pots in autumn and keep them in a cold frame.",
      },
      {
        month: 1,
        day: 20,
        shift: "spring",
        title: "Sow indoors",
        detail:
          "If you missed the autumn sowing, sow indoors in late winter and grow the seedlings cool and bright.",
      },
      {
        month: 4,
        day: 15,
        shift: "spring",
        title: "Plant out",
        detail:
          "Plant sweet peas beside their support after hardening off, and pinch out the tips.",
      },
      {
        month: 6,
        day: 10,
        shift: "none",
        title: "Cut often",
        detail: "Pick flowers every few days. Once seed pods form, the plant slows down.",
      },
    ],
  }),
  plant({
    id: "cosmos-bipinnatus",
    scientificName: "Cosmos bipinnatus",
    commonName: "Cosmos",
    kind: "seed",
    habit: "annual",
    summary:
      "A half-hardy annual with fine leaves and pink, white or crimson daisies from midsummer until frost. It flowers more, not less, in soil that is not heavily fed.",
    cultivation:
      "Sow indoors in mid-spring and plant out after frost, or sow direct in late spring in a warm garden. Stake tall forms if the site is windy.",
    pests: "Slugs take young plants. Aphids sometimes gather on the soft tips.",
    soils: ["loam", "sand", "chalk"],
    moisture: ["well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H3",
    maturity: "Flowers about 12 weeks from sowing",
    heightM: [0.8, 1.2],
    spreadM: [0.4, 0.5],
    months: year([
      { from: 5, to: 5 },
      { from: 6, to: 9, flower: "pink", flowerHex: "#f2a3c0" },
    ]),
    jobs: [
      {
        month: 3,
        day: 15,
        shift: "spring",
        title: "Sow indoors",
        detail: "Sow cosmos in trays in mid-spring and pot the seedlings on before they get leggy.",
      },
      {
        month: 4,
        day: 25,
        shift: "spring",
        title: "Plant out",
        detail: "Plant cosmos after the last frost, 40 cm apart, in the sunniest bed.",
      },
      {
        month: 7,
        day: 15,
        shift: "none",
        title: "Deadhead",
        detail: "Snip off faded daisies weekly so the plants keep flowering into autumn.",
      },
    ],
  }),
  plant({
    id: "helianthus-annuus",
    scientificName: "Helianthus annuus",
    commonName: "Sunflower",
    kind: "seed",
    habit: "annual",
    summary:
      "A fast annual with a thick stem and a large yellow flower, followed by a seed disc. Tall forms need a stake and a sunny, sheltered bed.",
    cultivation:
      "Sow indoors in mid-spring or direct in late spring once the soil has warmed. Water while the stem is extending. Birds will take the seed unless you net the heads.",
    pests: "Slugs demolish seedlings. Aphids crowd the growing tip.",
    soils: ["clay", "loam"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H2",
    maturity: "Flowers about 10–14 weeks from sowing",
    heightM: [1.5, 2.5],
    spreadM: [0.4, 0.5],
    months: year([
      { from: 5, to: 5 },
      { from: 6, to: 8, flower: "yellow", flowerHex: "#f0c21e" },
    ]),
    jobs: [
      {
        month: 3,
        day: 20,
        shift: "spring",
        title: "Sow indoors",
        detail: "Sow sunflowers singly in pots so the roots are not disturbed at planting.",
      },
      {
        month: 4,
        day: 28,
        shift: "spring",
        title: "Plant out and stake",
        detail: "Plant after frost and put the stake in at the same time. Water in dry weather.",
      },
      {
        month: 8,
        day: 20,
        shift: "none",
        title: "Save or feed seed",
        detail: "Cut heads as the seeds plump, or leave them for the birds.",
      },
    ],
  }),
  plant({
    id: "nigella-damascena",
    scientificName: "Nigella damascena",
    commonName: "Love-in-a-mist",
    kind: "seed",
    habit: "annual",
    summary:
      "A short annual with thread-like leaves, blue flowers and inflated seed pods. It is one of the easiest flowers to sow direct, and it comes again where seed is allowed to fall.",
    cultivation:
      "Sow outdoors in autumn or spring where it is to flower. Thin the seedlings rather than transplanting them. A second sowing in late spring extends the show.",
    pests: "Usually left alone. Dense sowings get floppy and can be thinned.",
    soils: ["chalk", "loam", "sand"],
    moisture: ["well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: BOTH,
    hardiness: "H5",
    maturity: "Flowers about 10–12 weeks from a spring sowing",
    heightM: [0.4, 0.5],
    spreadM: [0.2, 0.25],
    months: year([
      { from: 4, to: 4 },
      { from: 5, to: 6, flower: "blue", flowerHex: "#6f8fd6" },
      { from: 7, to: 7 },
    ]),
    jobs: [
      {
        month: 8,
        day: 25,
        shift: "autumn",
        title: "Sow direct",
        detail:
          "Scatter love-in-a-mist where it is to flower. Autumn seedlings overwinter in milder gardens.",
      },
      {
        month: 3,
        day: 10,
        shift: "spring",
        title: "Sow a spring row",
        detail: "Sow again in March for flowers after the autumn batch. Thin to 15 cm.",
      },
    ],
  }),
  plant({
    id: "calendula-officinalis",
    scientificName: "Calendula officinalis",
    commonName: "Pot marigold",
    kind: "seed",
    habit: "annual",
    summary:
      "A hardy annual with orange or yellow daisies over a long season, and a resinous scent. It will flower in cooler summers that stop more tender annuals.",
    cultivation:
      "Sow direct in autumn or spring. Deadhead, or it spends its energy on seed. It self-sows modestly.",
    pests:
      "Aphids and powdery mildew appear on tired plants. Pull those and rely on younger seedlings.",
    soils: ["chalk", "clay", "loam", "sand"],
    moisture: ["well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun", "partial-sun"],
    aspect: ALL_ASPECTS,
    exposure: BOTH,
    hardiness: "H5",
    maturity: "Flowers about 8–10 weeks from sowing",
    heightM: [0.3, 0.5],
    spreadM: [0.2, 0.3],
    months: year([
      { from: 4, to: 4 },
      { from: 5, to: 9, flower: "orange", flowerHex: "#ee8b2f" },
    ]),
    jobs: [
      {
        month: 3,
        day: 5,
        shift: "spring",
        title: "Sow direct",
        detail:
          "Sow pot marigold in shallow drills and thin to 20 cm. It does not need a rich bed.",
      },
      {
        month: 6,
        day: 1,
        shift: "none",
        title: "Deadhead",
        detail: "Pick off faded daisies every week, or cut whole stems for the house.",
      },
    ],
  }),
  plant({
    id: "lactuca-sativa",
    scientificName: "Lactuca sativa",
    commonName: "Lettuce",
    kind: "seed",
    habit: "annual",
    summary:
      "A quick salad crop. Loose-leaf kinds are more forgiving than tight hearts, and a little shade in high summer stops them bolting as fast.",
    cultivation:
      "Sow little and often from early spring. Keep the soil moist. In hot weather, sow in a bed that gets afternoon shade.",
    pests: "Slugs are the main loss. Sparrows sometimes shred seedlings.",
    soils: ["loam", "sand", "clay"],
    moisture: ["moist"],
    ph: ["neutral"],
    sun: ["full-sun", "partial-sun"],
    aspect: ALL_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H4",
    maturity: "Baby leaves in 4–6 weeks, hearts in 8–12 weeks",
    heightM: [0.15, 0.3],
    spreadM: [0.15, 0.25],
    months: year([{ from: 4, to: 8 }]),
    jobs: [
      {
        month: 2,
        day: 15,
        shift: "spring",
        title: "Sow under cover",
        detail:
          "Start the first lettuce in modules indoors or in a frame. Sow a short row every three weeks.",
      },
      {
        month: 4,
        day: 1,
        shift: "spring",
        title: "Sow outdoors",
        detail: "Once the soil is workable, sow direct and thin rather than letting plants crowd.",
      },
      {
        month: 5,
        day: 15,
        shift: "none",
        title: "Water steadily",
        detail: "Dry soil makes lettuce bitter and likely to bolt.",
      },
    ],
  }),
  plant({
    id: "solanum-lycopersicum",
    scientificName: "Solanum lycopersicum",
    commonName: "Tomato",
    kind: "seed",
    habit: "annual",
    summary:
      "A frost-tender fruiting annual. Outdoor tomatoes need the warmest, sunniest bed or a south wall; many UK summers suit them better in a greenhouse or a large pot against the house.",
    cultivation:
      "Sow indoors in warmth in early spring. Pot on, harden off, and plant only after frost. Water regularly once fruit sets and feed with a high-potash feed.",
    pests:
      "Blight browns leaves and fruit in warm wet weather. Whitefly is common under glass. Pinch side shoots on cordon varieties.",
    soils: ["loam"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral"],
    sun: ["full-sun"],
    aspect: ["south", "west"],
    exposure: ["sheltered"],
    hardiness: "H2",
    maturity: "First fruit about 16–20 weeks from sowing",
    heightM: [1, 1.8],
    spreadM: [0.4, 0.5],
    months: year([
      { from: 5, to: 5 },
      { from: 6, to: 8, flower: "red fruit", flowerHex: "#d3453a" },
    ]),
    jobs: [
      {
        month: 2,
        day: 10,
        shift: "spring",
        title: "Sow indoors",
        detail: "Sow tomatoes in warmth and move seedlings into bright light as soon as they show.",
      },
      {
        month: 4,
        day: 20,
        shift: "spring",
        title: "Plant out",
        detail:
          "Plant outdoor tomatoes after the last frost, in the sunniest sheltered bed, with a stout cane.",
      },
      {
        month: 7,
        day: 10,
        shift: "none",
        title: "Water and pick",
        detail:
          "Keep the soil evenly moist once fruit is swelling, and pick tomatoes as they colour.",
      },
    ],
  }),
  plant({
    id: "vicia-faba",
    scientificName: "Vicia faba",
    commonName: "Broad bean",
    kind: "seed",
    habit: "annual",
    summary:
      "A hardy bean sown in autumn or late winter for early summer pods. It stands colder weather than French beans and prefers a firm, moisture-retentive soil.",
    cultivation:
      "Sow 5 cm deep. Autumn sowings overwinter as small plants in milder districts; elsewhere sow from February. Pinch the tops once the first pods set, to discourage blackfly.",
    pests:
      "Blackfly gather on the soft tips. Mice dig up seed. Rust may speckle leaves late in the season.",
    soils: ["clay", "loam", "chalk"],
    moisture: ["moist"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun", "partial-sun"],
    aspect: ALL_ASPECTS,
    exposure: BOTH,
    hardiness: "H5",
    maturity: "Pods about 16 weeks from a spring sowing",
    heightM: [0.8, 1.2],
    spreadM: [0.3, 0.4],
    months: year([
      { from: 3, to: 3 },
      { from: 4, to: 5, flower: "white", flowerHex: "#f3f3f0" },
      { from: 6, to: 6 },
    ]),
    jobs: [
      {
        month: 10,
        day: 15,
        shift: "autumn",
        title: "Sow an autumn crop",
        detail:
          "In milder gardens, sow hardy broad beans 5 cm deep in autumn and net them against pigeons.",
      },
      {
        month: 1,
        day: 25,
        shift: "spring",
        title: "Sow in late winter",
        detail: "Sow a spring crop from February if the soil is not frozen.",
      },
      {
        month: 4,
        day: 25,
        shift: "none",
        title: "Pinch out tops",
        detail: "Once the lowest flowers have set, pinch the tips off to reduce blackfly.",
      },
    ],
  }),
  plant({
    id: "daucus-carota",
    scientificName: "Daucus carota",
    commonName: "Carrot",
    kind: "seed",
    habit: "annual",
    summary:
      "A root crop that wants deep, stone-free soil and an even supply of water. Short or round kinds are the realistic choice on heavy clay.",
    cultivation:
      "Sow direct in shallow drills from spring, thinly. Crushing the leaves while thinning attracts carrot fly, so cover the row with fine mesh.",
    pests: "Carrot fly is the serious pest. Forked roots come from fresh manure and stony ground.",
    soils: ["loam", "sand"],
    moisture: ["well-drained", "moist"],
    ph: ["neutral"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: BOTH,
    hardiness: "H4",
    maturity: "Early kinds in about 12 weeks",
    heightM: [0.2, 0.3],
    spreadM: [0.05, 0.1],
    months: year([{ from: 4, to: 8 }]),
    jobs: [
      {
        month: 3,
        day: 1,
        shift: "spring",
        title: "Sow the first row",
        detail:
          "Sow carrots thinly from March in soil that was manured for a previous crop, not this one.",
      },
      {
        month: 5,
        day: 1,
        shift: "none",
        title: "Cover against fly",
        detail: "Keep a fine mesh cover on the row, especially after thinning.",
      },
      {
        month: 6,
        day: 20,
        shift: "none",
        title: "Sow a late row",
        detail: "A June sowing of a faster variety gives autumn roots.",
      },
    ],
  }),
  plant({
    id: "phaseolus-vulgaris",
    scientificName: "Phaseolus vulgaris",
    commonName: "French bean",
    kind: "seed",
    habit: "annual",
    summary:
      "A frost-tender bean with white or lilac flowers and slender pods. Dwarf kinds crop without support; climbing kinds need a wigwam and a warm summer.",
    cultivation:
      "Sow indoors in late spring or direct once the soil is warm, usually late May in much of the UK. A second sowing in early July can crop before autumn if the weather holds.",
    pests:
      "Slugs take seedlings. Blackfly may gather on the tips. Cold nights check growth more than any insect.",
    soils: ["loam", "sand", "chalk"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H2",
    maturity: "Pods about 10–12 weeks from sowing",
    heightM: [0.4, 1.8],
    spreadM: [0.3, 0.4],
    months: year([
      { from: 5, to: 5 },
      { from: 6, to: 8, flower: "white", flowerHex: "#f7f7f4" },
    ]),
    jobs: [
      {
        month: 4,
        day: 10,
        shift: "spring",
        title: "Sow in pots",
        detail:
          "Sow French beans in pots under cover. Do not plant them out while nights are still cold.",
      },
      {
        month: 5,
        day: 10,
        shift: "spring",
        title: "Sow or plant outdoors",
        detail:
          "Sow direct or plant hardened seedlings once the soil is warm, later in the north than the south.",
      },
      {
        month: 7,
        day: 5,
        shift: "none",
        title: "Pick young pods",
        detail:
          "Harvest French beans every couple of days. Pods left to swell stop the plant cropping.",
      },
    ],
  }),
  plant({
    id: "pisum-sativum",
    scientificName: "Pisum sativum",
    commonName: "Garden pea",
    kind: "seed",
    habit: "annual",
    summary:
      "A cool-season climber with white flowers and pods in early summer. It prefers moist soil and something to scramble on, and it dislikes midsummer heat.",
    cultivation:
      "Sow from late winter under cover, or direct from March. Mice are fond of the seed, so a covered row helps. Pick pods young.",
    pests:
      "Pea moth, mice and pigeons are the usual problems. A mesh cover deals with the last two.",
    soils: ["loam", "clay", "chalk"],
    moisture: ["moist"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun", "partial-sun"],
    aspect: ALL_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H5",
    maturity: "Pods about 12–16 weeks from sowing",
    heightM: [0.6, 1.5],
    spreadM: [0.2, 0.3],
    months: year([
      { from: 3, to: 3 },
      { from: 4, to: 5, flower: "white", flowerHex: "#f4f4f1" },
      { from: 6, to: 6 },
    ]),
    jobs: [
      {
        month: 2,
        day: 1,
        shift: "spring",
        title: "Sow the first row",
        detail: "Sow peas 4 cm deep indoors, or outdoors if the soil is workable.",
      },
      {
        month: 3,
        day: 15,
        shift: "spring",
        title: "Put up supports",
        detail: "Pea sticks or netting should be in place before the plants flop.",
      },
      {
        month: 6,
        day: 5,
        shift: "none",
        title: "Pick and water",
        detail: "Harvest peas as the pods fill, and water if the soil dries while they swell.",
      },
    ],
  }),
  plant({
    id: "borago-officinalis",
    scientificName: "Borago officinalis",
    commonName: "Borage",
    kind: "seed",
    habit: "annual",
    summary:
      "A bristly annual with starry blue flowers over a long summer, much visited by bees. It sows itself freely and is best given a corner rather than a formal row.",
    cultivation:
      "Sow direct in spring where it is to flower. It manages in poor soil. Pull surplus seedlings before it leans over its neighbours.",
    pests: "Almost none. It can become a weed if every seedling is left.",
    soils: ["chalk", "loam", "sand"],
    moisture: ["well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun", "partial-sun"],
    aspect: ALL_ASPECTS,
    exposure: BOTH,
    hardiness: "H5",
    maturity: "Flowers about 8–10 weeks from sowing",
    heightM: [0.6, 0.9],
    spreadM: [0.4, 0.5],
    months: year([
      { from: 4, to: 4 },
      { from: 5, to: 8, flower: "blue", flowerHex: "#3d6ed6" },
    ]),
    jobs: [
      {
        month: 3,
        day: 20,
        shift: "spring",
        title: "Sow direct",
        detail: "Sow borage where it is to flower and thin to 30 cm.",
      },
      {
        month: 7,
        day: 20,
        shift: "none",
        title: "Limit the seed",
        detail: "Pull plants before every flower drops seed if you do not want a colony next year.",
      },
    ],
  }),
];

export function getPlant(id: string): Plant | undefined {
  return PLANTS.find((entry) => entry.id === id);
}

export const SEASONS = [
  { id: "spring", label: "Spring", months: [2, 3, 4] },
  { id: "summer", label: "Summer", months: [5, 6, 7] },
  { id: "autumn", label: "Autumn", months: [8, 9, 10] },
  { id: "winter", label: "Winter", months: [11, 0, 1] },
] as const;

export function seasonLook(record: Plant, months: readonly number[]) {
  const rows = months
    .map((month) => record.months[month])
    .filter((row): row is MonthLook => row !== undefined);
  const flowers = [...new Set(rows.flatMap((row) => (row.flower ? [row.flower] : [])))];
  return {
    foliage: rows.some((row) => row.foliage),
    flowers,
    scent: rows.some((row) => row.scent),
  };
}
