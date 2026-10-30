import type { Plant } from "../types";
import { ALL_ASPECTS, BOTH, SUNNY_ASPECTS, year, plant } from "./shared";

export const FRUIT: Plant[] = [
  plant({
    id: "malus-evereste",
    scientificName: "Malus 'Evereste'",
    commonName: "Evereste crab apple",
    kind: "plant",
    group: "fruit",
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
    id: "malus-domestica-bramley",
    scientificName: "Malus domestica 'Bramley's Seedling'",
    commonName: "Bramley apple",
    kind: "plant",
    group: "fruit",
    habit: "tree",
    summary:
      "The cooker grown in more British gardens than any other apple. The fruit is large and green, sharp in the pan, and it keeps into the new year. It does not crop well as a single tree.",
    cultivation:
      "Plant a tree on a semi-dwarfing rootstock while it is dormant, and stake it. Bramley is a triploid, so it needs two other apple trees nearby that flower at the same time. Pick the fruit in October, before it falls, and store it cool.",
    pests:
      "Codling moth maggots the fruit. Scab marks leaves and apples in a wet spring. Canker can kill young shoots on a wet site.",
    soils: ["chalk", "clay", "loam", "sand"],
    moisture: ["moist", "well-drained"],
    ph: ["acid", "neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: BOTH,
    hardiness: "H6",
    maturity: "A useful crop from about the third or fourth year",
    heightM: [2.5, 4],
    spreadM: [2.5, 4],
    months: year([
      { from: 3, to: 3 },
      { from: 4, to: 4, flower: "pink-white", flowerHex: "#f3d5dc" },
      { from: 5, to: 8 },
      { from: 9, to: 9, flower: "green fruit", flowerHex: "#8fa36a" },
    ]),
    jobs: [
      {
        month: 10,
        day: 15,
        shift: "autumn",
        title: "Plant",
        detail:
          "Plant Bramley in the dormant season, no deeper than the nursery mark, with the graft above the soil.",
      },
      {
        month: 1,
        day: 15,
        shift: "none",
        title: "Winter prune",
        detail: "Take out dead, crossing and inward branches while the tree is leafless.",
      },
      {
        month: 9,
        day: 10,
        shift: "autumn",
        title: "Pick for storing",
        detail: "Pick fruit when it parts easily from the spur, and keep only sound apples.",
      },
    ],
  }),
  plant({
    id: "pyrus-communis-conference",
    scientificName: "Pyrus communis 'Conference'",
    commonName: "Conference pear",
    kind: "plant",
    group: "fruit",
    habit: "tree",
    summary:
      "The pear most often planted in Britain, and one of the few that sets a crop without another pear nearby. The long fruit ripens in early autumn if the blossom escapes a late frost.",
    cultivation:
      "Plant in the dormant season in a sunny, sheltered spot, out of a frost pocket. Thin heavy crops in July. Pick Conference in September while it is still firm, and ripen the fruit indoors.",
    pests:
      "Scab, canker and aphids. Wasps and birds take ripe fruit. Blossom is the part a cold April spoils.",
    soils: ["loam", "clay", "chalk"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H5",
    maturity: "Fruit from about the fourth year",
    heightM: [2.5, 4],
    spreadM: [2, 3],
    months: year([
      { from: 3, to: 3, flower: "white", flowerHex: "#f7f6f2" },
      { from: 4, to: 7 },
      { from: 8, to: 9, flower: "green-yellow fruit", flowerHex: "#c5b15a" },
    ]),
    jobs: [
      {
        month: 10,
        day: 20,
        shift: "autumn",
        title: "Plant",
        detail:
          "Plant Conference while dormant, and stake a young tree. Avoid a hollow where frost sits.",
      },
      {
        month: 6,
        day: 20,
        shift: "none",
        title: "Thin the fruit",
        detail:
          "In a heavy year, thin to one or two pears to a cluster so the branches do not break.",
      },
      {
        month: 8,
        day: 20,
        shift: "autumn",
        title: "Pick firm",
        detail: "Pick before the pears are soft on the tree. They finish ripening in a cool room.",
      },
    ],
  }),
  plant({
    id: "prunus-domestica-victoria",
    scientificName: "Prunus domestica 'Victoria'",
    commonName: "Victoria plum",
    kind: "plant",
    group: "fruit",
    habit: "tree",
    summary:
      "A self-fertile plum with pink-red fruit in August, and the variety most often grown in UK gardens. It can crop so heavily that branches snap if the fruit is not thinned.",
    cultivation:
      "Plant in autumn in a sheltered, sunny place. Prune only in summer, never in winter, because silver leaf disease enters winter cuts. Thin the fruitlets in early summer on a laden tree.",
    pests:
      "Wasps and brown rot spoil ripe plums. Aphids curl the young leaves. Birds take fruit as it colours.",
    soils: ["loam", "clay", "chalk"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral", "alkaline"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H5",
    maturity: "A crop from about the fourth year",
    heightM: [2.5, 4],
    spreadM: [2.5, 3.5],
    months: year([
      { from: 3, to: 3, flower: "white", flowerHex: "#f7f6f2" },
      { from: 4, to: 6 },
      { from: 7, to: 7, flower: "pink-red fruit", flowerHex: "#c45b6a" },
    ]),
    jobs: [
      {
        month: 10,
        day: 10,
        shift: "autumn",
        title: "Plant",
        detail: "Plant Victoria in autumn, on a stake, where late frost is least likely to settle.",
      },
      {
        month: 6,
        day: 10,
        shift: "none",
        title: "Thin and summer-prune",
        detail:
          "Thin crowded fruitlets, and do any pruning now. Leave winter cuts alone because of silver leaf.",
      },
      {
        month: 7,
        day: 15,
        shift: "none",
        title: "Pick ripe fruit",
        detail:
          "Pick plums as they soften and colour. They do not keep, so use them within a few days.",
      },
    ],
  }),
  plant({
    id: "fragaria-ananassa",
    scientificName: "Fragaria × ananassa",
    commonName: "Strawberry",
    kind: "plant",
    group: "fruit",
    habit: "clump",
    summary:
      "A low perennial for a sunny bed or a pot. Summer-fruiting kinds, such as Cambridge Favourite, give one heavy crop in June. Replace the plants every three or four years.",
    cultivation:
      "Plant in late summer or early spring with the crown at soil level, about 35 cm apart. Water in dry spells while the fruit swells, and tuck straw or a mat under the trusses. Cut off surplus runners.",
    pests:
      "Birds, slugs and botrytis. A net is the useful defence. Vine weevil grubs eat the roots of plants in pots.",
    soils: ["loam", "sand", "chalk"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral", "acid"],
    sun: ["full-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H6",
    maturity: "Fruit the summer after planting",
    heightM: [0.15, 0.25],
    spreadM: [0.25, 0.4],
    months: year([
      { from: 2, to: 3 },
      { from: 4, to: 4, flower: "white", flowerHex: "#f7f7f4" },
      { from: 5, to: 6, flower: "red fruit", flowerHex: "#d64545" },
      { from: 7, to: 8 },
    ]),
    jobs: [
      {
        month: 7,
        day: 20,
        shift: "none",
        title: "Plant",
        detail:
          "Plant runners or cold-stored plants in late summer so they establish before winter. Keep the crown above the soil.",
      },
      {
        month: 4,
        day: 20,
        shift: "spring",
        title: "Straw and net",
        detail:
          "Tuck straw under the flowers as they set, and net the bed before the fruit colours.",
      },
      {
        month: 6,
        day: 1,
        shift: "none",
        title: "Pick and tidy",
        detail:
          "Pick every couple of days. Afterwards, shear old leaves from summer-fruiting plants and remove spare runners.",
      },
    ],
  }),
  plant({
    id: "rubus-idaeus",
    scientificName: "Rubus idaeus 'Autumn Bliss'",
    commonName: "Autumn Bliss raspberry",
    kind: "plant",
    group: "fruit",
    habit: "shrub",
    summary:
      "An autumn-fruiting raspberry that carries fruit on this year's canes, from August into October. It suits a small UK garden because the pruning is simply to cut every cane down in winter.",
    cultivation:
      "Plant canes in the dormant season, 40 cm apart, in moist soil that does not dry out or sit wet. A post and wire keeps them upright. Mulch in spring. Cut all the canes to the ground in February.",
    pests:
      "Birds take the berries, so net as they colour. Raspberry beetle can maggot early fruit. Aphids curl the tips.",
    soils: ["loam", "clay", "sand"],
    moisture: ["moist", "well-drained"],
    ph: ["acid", "neutral"],
    sun: ["full-sun", "partial-sun"],
    aspect: SUNNY_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H6",
    maturity: "Fruit from the first or second autumn",
    heightM: [1.2, 1.6],
    spreadM: [0.4, 0.6],
    months: year([
      { from: 3, to: 6 },
      { from: 7, to: 9, flower: "red fruit", flowerHex: "#c83b4a" },
    ]),
    jobs: [
      {
        month: 10,
        day: 25,
        shift: "autumn",
        title: "Plant canes",
        detail:
          "Plant dormant canes at the same depth they grew before, and cut them back to 30 cm.",
      },
      {
        month: 1,
        day: 15,
        shift: "none",
        title: "Cut to the ground",
        detail:
          "In February, cut every cane of an autumn variety down to soil level. New canes fruit the same year.",
      },
      {
        month: 7,
        day: 20,
        shift: "none",
        title: "Net and pick",
        detail: "Net the row as the berries turn, and pick over the canes every few days.",
      },
    ],
  }),
  plant({
    id: "ribes-nigrum",
    scientificName: "Ribes nigrum 'Ben Sarek'",
    commonName: "Ben Sarek blackcurrant",
    kind: "plant",
    group: "fruit",
    habit: "shrub",
    summary:
      "A compact blackcurrant bred in Scotland, short enough for a small garden and heavy with fruit in July. Blackcurrants are tart, and they are usually cooked.",
    cultivation:
      "Plant in the dormant season, slightly deeper than it grew in the pot, and mulch. Ben Sarek is self-fertile. In winter, cut out about a third of the oldest dark stems at the base so new shoots replace them.",
    pests:
      "Birds strip the fruit. Big bud mite swells winter buds and spreads reversion. Net the bush as the currants colour, and pick off fat buds.",
    soils: ["loam", "clay"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral", "acid"],
    sun: ["full-sun", "partial-sun"],
    aspect: ALL_ASPECTS,
    exposure: ["sheltered"],
    hardiness: "H6",
    maturity: "A good crop from the second summer",
    heightM: [1, 1.2],
    spreadM: [1, 1.2],
    months: year([
      { from: 3, to: 5 },
      { from: 6, to: 6, flower: "black fruit", flowerHex: "#2a2430" },
      { from: 7, to: 8 },
    ]),
    jobs: [
      {
        month: 10,
        day: 20,
        shift: "autumn",
        title: "Plant",
        detail: "Plant Ben Sarek in autumn, a little deeper than the soil mark, and water it in.",
      },
      {
        month: 0,
        day: 20,
        shift: "none",
        title: "Winter prune",
        detail:
          "Cut out up to a third of the oldest stems at ground level while the bush is dormant.",
      },
      {
        month: 6,
        day: 15,
        shift: "none",
        title: "Pick",
        detail: "Pick whole strigs when the currants are black and just soft. Net beforehand.",
      },
    ],
  }),
  plant({
    id: "ribes-uva-crispa",
    scientificName: "Ribes uva-crispa 'Invicta'",
    commonName: "Invicta gooseberry",
    kind: "plant",
    group: "fruit",
    habit: "shrub",
    summary:
      "A thorny bush with sharp green fruit in early summer, for cooking or for leaving to ripen. Invicta is the variety usually recommended because it resists American gooseberry mildew.",
    cultivation:
      "Plant in the dormant season in any reasonable soil, in sun or light shade. Prune in winter to an open goblet so air can move through the bush and you can reach the fruit. It is self-fertile.",
    pests:
      "Gooseberry sawfly caterpillars can strip a bush in a few days, so check the centre of the plant from May. Birds take the buds. Mildew is less trouble on Invicta than on older varieties.",
    soils: ["loam", "clay", "chalk", "sand"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral", "alkaline", "acid"],
    sun: ["full-sun", "partial-sun"],
    aspect: ALL_ASPECTS,
    exposure: BOTH,
    hardiness: "H6",
    maturity: "Fruit from the second summer",
    heightM: [1, 1.3],
    spreadM: [1, 1.3],
    months: year([
      { from: 3, to: 4 },
      { from: 5, to: 6, flower: "green fruit", flowerHex: "#b5c46a" },
      { from: 7, to: 7 },
    ]),
    jobs: [
      {
        month: 10,
        day: 15,
        shift: "autumn",
        title: "Plant",
        detail: "Plant Invicta while dormant. A bush on a short leg is easier to weed under.",
      },
      {
        month: 0,
        day: 15,
        shift: "none",
        title: "Winter prune",
        detail:
          "Shorten last year's growth and keep the centre open. Wear gloves. Gooseberries are thorny.",
      },
      {
        month: 5,
        day: 20,
        shift: "none",
        title: "Pick",
        detail:
          "Pick small green berries for cooking in June, or wait until July if you want them sweeter.",
      },
    ],
  }),
  plant({
    id: "rheum-rhabarbarum",
    scientificName: "Rheum rhabarbarum 'Timperley Early'",
    commonName: "Timperley Early rhubarb",
    kind: "plant",
    group: "fruit",
    habit: "clump",
    summary:
      "A perennial crown grown for its pink stems from spring into early summer. Timperley Early is a common UK variety and one of the first to pull. The leaves are poisonous. Only the stalk is eaten.",
    cultivation:
      "Plant a crown in autumn or winter with the bud just at the surface, in rich, moist soil. Do not pull stalks in the first year. After that, pull a few at a time with a twist, and stop by midsummer so the crown can recover. Mulch in winter.",
    pests:
      "Slugs hide in the crown. Crown rot follows waterlogged soil. Flower stems, if they appear, should be cut out so the plant keeps its strength.",
    soils: ["loam", "clay"],
    moisture: ["moist", "well-drained"],
    ph: ["neutral", "acid"],
    sun: ["full-sun", "partial-sun"],
    aspect: ALL_ASPECTS,
    exposure: BOTH,
    hardiness: "H6",
    maturity: "A light pull in the second spring, freely after that",
    heightM: [0.6, 0.9],
    spreadM: [0.9, 1.2],
    months: year([
      { from: 2, to: 2 },
      { from: 3, to: 5, flower: "red stalks", flowerHex: "#c4474a" },
      { from: 6, to: 8 },
    ]),
    jobs: [
      {
        month: 10,
        day: 15,
        shift: "autumn",
        title: "Plant a crown",
        detail:
          "Plant Timperley Early while dormant, with the bud at soil level, and mulch. Do not bury the crown.",
      },
      {
        month: 3,
        day: 15,
        shift: "spring",
        title: "Pull stalks",
        detail:
          "From the second year, pull stalks as they reach a useful size. Leave at least half the leaves on the plant.",
      },
      {
        month: 5,
        day: 20,
        shift: "none",
        title: "Stop pulling",
        detail: "Stop by midsummer and let the remaining leaves feed the crown for next year.",
      },
    ],
  }),
];
