// Auto-generated catalog of APEPDCL Area / Service Codes
import kakinadaJson from '../data/kakinadaAreaCodes.json';

export interface AreaCodeItem {
  code: string;
  count: number;
  label: string;
  loc: string;
  division?: string;
  section?: string;
  village?: string;
}

export interface KakinadaAreaCodeRecord {
  code: string;
  village: string;
  areaName: string;
  section: string;
  subdivision: string;
  division: string;
  circle: string;
  label: string;
}

export const KAKINADA_AREA_CODES: KakinadaAreaCodeRecord[] = kakinadaJson as KakinadaAreaCodeRecord[];
export const KAKINADA_DIVISIONS = ['ALL', 'JAGGAMPETA', 'KAKINADA', 'PEDDAPURAM'] as const;

export function extractAreaCode(scNumber?: string | null): string | null {
  if (!scNumber) return null;
  const clean = scNumber.trim();
  if (clean.length < 10) return null;
  // User logic: remove last 6 digits, then pick last 4 digits
  return clean.slice(0, -6).slice(-4);
}

// Format: [code, count, locality]
const RAW_PITHAPURAM_CODES: [string, number, string][] = [
 [
  "0501",
  972,
  "PITHAPURAM"
 ],
 [
  "0701",
  931,
  "TUNI"
 ],
 [
  "0801",
  555,
  "GANDHIMARKET (ANAKAPALLE)"
 ],
 [
  "0633",
  261,
  "DEVARPALLI (GOPALAPURAM)"
 ],
 [
  "0504",
  247,
  "ANNAVARAM (TUNI)"
 ],
 [
  "0601",
  205,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "0711",
  192,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "0605",
  151,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0502",
  145,
  "PITHAPURAM"
 ],
 [
  "0606",
  140,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0807",
  128,
  "PRATHIPADU"
 ],
 [
  "0503",
  125,
  "PITHAPURAM"
 ],
 [
  "0635",
  121,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0804",
  115,
  "BAYYANNAGUDEM (POLAVARAM)"
 ],
 [
  "0627",
  104,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0624",
  103,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0714",
  100,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "0803",
  95,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0506",
  92,
  "GOKAVARAM (KORUKONDA)"
 ],
 [
  "0604",
  91,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "0811",
  89,
  "BAYYANNAGUDEM (POLAVARAM)"
 ],
 [
  "0719",
  85,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "0634",
  81,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0609",
  81,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0505",
  80,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "0722",
  78,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "0626",
  76,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0622",
  73,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0710",
  73,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "0835",
  69,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0812",
  67,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0809",
  66,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0640",
  63,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0708",
  63,
  "KATRENIKONA (MUMMIDIVARAM)"
 ],
 [
  "0712",
  60,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "0831",
  58,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0806",
  56,
  "PRATHIPADU"
 ],
 [
  "0631",
  54,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0814",
  54,
  "UNDI (AKIVEEDU)"
 ],
 [
  "0630",
  51,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0810",
  48,
  "UNDI (AKIVEEDU)"
 ],
 [
  "0717",
  47,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "0721",
  45,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "0602",
  44,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0838",
  41,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0603",
  40,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0815",
  40,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0802",
  39,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0632",
  38,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0713",
  36,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "0623",
  34,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0830",
  33,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0720",
  33,
  "UNDI (AKIVEEDU)"
 ],
 [
  "0637",
  30,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0922",
  29,
  "PRAKASHAM CHOWK (BHIMAVARAM)"
 ],
 [
  "0813",
  28,
  "PRATHIPADU"
 ],
 [
  "0805",
  26,
  "INDUSTRIAL ESTATE (BHIMAVARAM)"
 ],
 [
  "0625",
  26,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0808",
  24,
  "PRATHIPADU"
 ],
 [
  "0621",
  23,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "0836",
  19,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0818",
  18,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0715",
  17,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "0643",
  17,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0834",
  16,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0839",
  15,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0716",
  15,
  "KAVITI (SOMPETA)"
 ],
 [
  "0832",
  14,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0718",
  13,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "0837",
  13,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0641",
  9,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0642",
  8,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0833",
  7,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0841",
  6,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0822",
  5,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0848",
  5,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0843",
  4,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0826",
  4,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0819",
  2,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0847",
  1,
  "U.KOTHAPALLI (PITHAPURAM)"
 ]
];

// Raw catalog for codes with count >= 3
const RAW_CATALOG: [string, number, string][] = [
 [
  "0401",
  1172,
  "JANGAREDDYGUDEM"
 ],
 [
  "1001",
  1081,
  "RAVULAPALEM (KOTHAPETA)"
 ],
 [
  "0501",
  972,
  "PITHAPURAM"
 ],
 [
  "0701",
  931,
  "TUNI"
 ],
 [
  "4104",
  862,
  "MALLAYYAPETA (RAJAMAHENDRAVARAM)"
 ],
 [
  "4301",
  666,
  "JAGANNAICKPUR (SARPAVARAM)"
 ],
 [
  "0102",
  662,
  "KALLA (AKIVEEDU)"
 ],
 [
  "A001",
  639,
  "PARVATHIPURAM"
 ],
 [
  "3303",
  626,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "3306",
  610,
  "PRATAPNAGAR (SARPAVARAM)"
 ],
 [
  "4001",
  609,
  "DIARY FARM (KAKINADA)"
 ],
 [
  "4518",
  573,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "0801",
  555,
  "GANDHIMARKET (ANAKAPALLE)"
 ],
 [
  "P001",
  525,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "0151",
  493,
  "AMALAPURAM"
 ],
 [
  "0131",
  488,
  "NIDADAVOLE"
 ],
 [
  "0103",
  479,
  "GANDEPALLI (JAGGAMPETA)"
 ],
 [
  "5101",
  478,
  "ARTS COLLEGE (MORAMPUDI)"
 ],
 [
  "D011",
  468,
  "GANDHIMARKET (ANAKAPALLE)"
 ],
 [
  "5001",
  461,
  "PEDDAPURAM (SAMALKOTA)"
 ],
 [
  "0216",
  460,
  "MUMMIDIVARAM"
 ],
 [
  "A202",
  458,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "3101",
  453,
  "SANTHI NAGAR (ELURU)"
 ],
 [
  "I900",
  434,
  "NARSIPATNAM"
 ],
 [
  "4103",
  420,
  "PORT (KAKINADA)"
 ],
 [
  "5100",
  412,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "3322",
  398,
  "PEDAPADU (DENDULURU)"
 ],
 [
  "4101",
  396,
  "PORT (KAKINADA)"
 ],
 [
  "3105",
  390,
  "SANTHI NAGAR (ELURU)"
 ],
 [
  "G601",
  384,
  "PAYAKARAOPETA (PAYAKARAO PETA)"
 ],
 [
  "7903",
  383,
  "KONTHAMURU (RAJAMAHENDRAVARAM)"
 ],
 [
  "0301",
  379,
  "PRATHIPADU"
 ],
 [
  "2101",
  376,
  "PAYAKARAOPETA (PAYAKARAO PETA)"
 ],
 [
  "N301",
  371,
  "NARASANNAPETA"
 ],
 [
  "2204",
  370,
  "KAMBALA CHERUVU (RAJAMAHENDRAVARAM)"
 ],
 [
  "0201",
  363,
  "KORUKONDA"
 ],
 [
  "4901",
  362,
  "SAMALKOTA"
 ],
 [
  "0107",
  361,
  "ANAPARTHY"
 ],
 [
  "1006",
  350,
  "NARSAPURAM"
 ],
 [
  "00GW",
  349,
  "GAJUWAKA"
 ],
 [
  "1101",
  340,
  "KASIMKOTA"
 ],
 [
  "Y006",
  331,
  "ELAMANCHILI"
 ],
 [
  "6201",
  330,
  "MORAMPUDI"
 ],
 [
  "M001",
  329,
  "RAJAM"
 ],
 [
  "2001",
  327,
  "NGOS COLONY (TANUKU)"
 ],
 [
  "C013",
  321,
  "CHODAVARAM"
 ],
 [
  "4501",
  319,
  "GYGOLAPADU (SARPAVARAM)"
 ],
 [
  "0172",
  317,
  "CHAGALLU (KOVVURU)"
 ],
 [
  "7701",
  310,
  "AGANAMPUDI"
 ],
 [
  "D012",
  309,
  "ANAKAPALLI (ANAKAPALLE)"
 ],
 [
  "0101",
  307,
  "ANAPARTHY"
 ],
 [
  "3104",
  306,
  "ALCOT GARDENS (RAJAMAHENDRAVARAM)"
 ],
 [
  "3112",
  306,
  "NALLAJERLA"
 ],
 [
  "6101",
  303,
  "POWERPET (ELURU)"
 ],
 [
  "0511",
  297,
  "PALASA"
 ],
 [
  "T320",
  290,
  "TEKKALI"
 ],
 [
  "3321",
  287,
  "INDRAPALEM (SARPAVARAM)"
 ],
 [
  "4003",
  282,
  "DIARY FARM (KAKINADA)"
 ],
 [
  "1105",
  281,
  "KOTADIBBA (ELURU)"
 ],
 [
  "4002",
  277,
  "DIARY FARM (KAKINADA)"
 ],
 [
  "7511",
  275,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "3323",
  267,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "1114",
  265,
  "KOTADIBBA (ELURU)"
 ],
 [
  "0758",
  265,
  "KOTANANDURU (TUNI)"
 ],
 [
  "1107",
  264,
  "KOTTURU RESCO (KOTTURU)"
 ],
 [
  "0106",
  262,
  "GANDEPALLI (JAGGAMPETA)"
 ],
 [
  "2290",
  262,
  "PENDURTHI"
 ],
 [
  "0116",
  261,
  "GANDEPALLI (JAGGAMPETA)"
 ],
 [
  "0304",
  261,
  "PRATHIPADU"
 ],
 [
  "0633",
  261,
  "DEVARPALLI (GOPALAPURAM)"
 ],
 [
  "0325",
  254,
  "RAJANAGARAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "3301",
  252,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "0313",
  252,
  "RAZOLE"
 ],
 [
  "0105",
  251,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "00V1",
  248,
  "VADLAPUDI (AUTONAGAR)"
 ],
 [
  "0504",
  247,
  "ANNAVARAM (TUNI)"
 ],
 [
  "0306",
  246,
  "RAJANAGARAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "4502",
  245,
  "GYGOLAPADU (SARPAVARAM)"
 ],
 [
  "R101",
  243,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "0104",
  239,
  "KOVVUR (KOVVURU)"
 ],
 [
  "0331",
  239,
  "KASIBUGGA (PALASA)"
 ],
 [
  "G217",
  239,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "0112",
  232,
  "KIRLAMPUDI (JAGGAMPETA)"
 ],
 [
  "3103",
  231,
  "ALCOT GARDENS (RAJAMAHENDRAVARAM)"
 ],
 [
  "0305",
  220,
  "BICCAVOLU (ANAPARTHY)"
 ],
 [
  "1106",
  219,
  "KOTADIBBA (ELURU)"
 ],
 [
  "4105",
  218,
  "TANGELLAMUDI (DENDULURU)"
 ],
 [
  "2303",
  217,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "7901",
  214,
  "KONTHAMURU (RAJAMAHENDRAVARAM)"
 ],
 [
  "0212",
  213,
  "DOMMERU (KOVVURU)"
 ],
 [
  "5217",
  213,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "3102",
  213,
  "YELESWARAM (PRATHIPADU)"
 ],
 [
  "1274",
  213,
  "GANGAVARAM-VSKP (MALKAPURAM)"
 ],
 [
  "1013",
  213,
  "NARSAPURAM"
 ],
 [
  "8401",
  212,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "4514",
  210,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "1005",
  207,
  "ALAMURU (KOTHAPETA)"
 ],
 [
  "0601",
  205,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "2105",
  204,
  "RAMACHANDRAPURAM"
 ],
 [
  "6301",
  203,
  "SATELLITE CITY (MORAMPUDI)"
 ],
 [
  "0210",
  203,
  "DOMMERU (KOVVURU)"
 ],
 [
  "I601",
  202,
  "P.N.COLONY (SRIKAKULAM)"
 ],
 [
  "0123",
  201,
  "PURUSHOTHAPALLI (NIDADAVOLE)"
 ],
 [
  "7201",
  201,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "P003",
  201,
  "BOBBILI"
 ],
 [
  "A106",
  198,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "0114",
  197,
  "PEDAPUDI (KARAPA)"
 ],
 [
  "R104",
  195,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "0159",
  195,
  "RANGAMPETA (ANAPARTHY)"
 ],
 [
  "3111",
  193,
  "SANTHI NAGAR (ELURU)"
 ],
 [
  "4005",
  193,
  "LINGAPALEM (PEDAVEGI)"
 ],
 [
  "1150",
  193,
  "MALKAPURAM"
 ],
 [
  "0711",
  192,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "2250",
  192,
  "PENDURTHI"
 ],
 [
  "0202",
  191,
  "KAPILESWARAPURAM (MANDAPETA)"
 ],
 [
  "S201",
  191,
  "BALIJIPETA (PARVATHIPURAM)"
 ],
 [
  "0235",
  190,
  "NEELADRIPURAM (PEDATADEPALLI)"
 ],
 [
  "8020",
  189,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "0115",
  186,
  "PEDAPUDI (KARAPA)"
 ],
 [
  "2114",
  183,
  "R R PETA (ELURU)"
 ],
 [
  "0109",
  181,
  "ANAPARTHY"
 ],
 [
  "5105",
  181,
  "ARTS COLLEGE (MORAMPUDI)"
 ],
 [
  "5220",
  181,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "4109",
  180,
  "TANGELLAMUDI (DENDULURU)"
 ],
 [
  "2011",
  178,
  "BHIMADOLU"
 ],
 [
  "7501",
  176,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "P021",
  175,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "A104",
  175,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "1115",
  175,
  "KOTADIBBA (ELURU)"
 ],
 [
  "1260",
  175,
  "GANGAVARAM-VSKP (MALKAPURAM)"
 ],
 [
  "0901",
  174,
  "ASR NAGAR (BHIMAVARAM)"
 ],
 [
  "S900",
  173,
  "SALURU"
 ],
 [
  "2155",
  172,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "0273",
  172,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "0341",
  171,
  "TADIKALAPUDI (KAMAVARAPUKOTA)"
 ],
 [
  "1151",
  170,
  "SRIHARIPURAM (MALKAPURAM)"
 ],
 [
  "G202",
  169,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "0203",
  168,
  "KAMANAGARUVU (AMALAPURAM)"
 ],
 [
  "0111",
  168,
  "PEDAPUDI (KARAPA)"
 ],
 [
  "0002",
  167,
  "KADIAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "3113",
  166,
  "NALLAJERLA"
 ],
 [
  "7211",
  166,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "3008",
  165,
  "TETALI (TANUKU)"
 ],
 [
  "2157",
  165,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "5216",
  165,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "I916",
  165,
  "NARSIPATNAM"
 ],
 [
  "CH01",
  163,
  "CHIPURUPALLI"
 ],
 [
  "2201",
  162,
  "KAJULURU (KARAPA)"
 ],
 [
  "00M1",
  161,
  "MINDI (GAJUWAKA)"
 ],
 [
  "3110",
  161,
  "SANTHI NAGAR (ELURU)"
 ],
 [
  "2275",
  160,
  "SUJATHANAGAR (PENDURTHI)"
 ],
 [
  "5109",
  159,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "1003",
  159,
  "ALAMURU (KOTHAPETA)"
 ],
 [
  "0181",
  157,
  "JAGGAMPETA"
 ],
 [
  "00S1",
  157,
  "AUTONAGAR"
 ],
 [
  "6023",
  155,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "4206",
  155,
  "MOGALTURU (NARSAPURAM)"
 ],
 [
  "GV23",
  154,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "G500",
  154,
  "NELLIMARLA"
 ],
 [
  "0239",
  153,
  "NEELADRIPURAM (PEDATADEPALLI)"
 ],
 [
  "1252",
  153,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "A042",
  153,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "6308",
  153,
  "SATELLITE CITY (MORAMPUDI)"
 ],
 [
  "00C7",
  152,
  "CHINAGANTYADA (GAJUWAKA)"
 ],
 [
  "0605",
  151,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0652",
  151,
  "SAKHINETIPALLI (RAZOLE)"
 ],
 [
  "7001",
  151,
  "ATTILI (TANUKU)"
 ],
 [
  "0403",
  150,
  "SAMPATHNAGARAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "2502",
  149,
  "MANDAPETA"
 ],
 [
  "3001",
  149,
  "TETALI (TANUKU)"
 ],
 [
  "1307",
  149,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "7904",
  147,
  "KONTHAMURU (RAJAMAHENDRAVARAM)"
 ],
 [
  "0531",
  146,
  "AKIVEEDU"
 ],
 [
  "0302",
  146,
  "BICCAVOLU (ANAPARTHY)"
 ],
 [
  "0502",
  145,
  "PITHAPURAM"
 ],
 [
  "8403",
  145,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "4013",
  145,
  "UNDRAJAVARAM (NIDADAVOLE)"
 ],
 [
  "0410",
  145,
  "SANKHAVARAM (PRATHIPADU)"
 ],
 [
  "B001",
  145,
  "DEVARAPALLI (CHODAVARAM)"
 ],
 [
  "G209",
  143,
  "DASANNAPETA (VIZIANAGARAM)"
 ],
 [
  "0001",
  143,
  "KADIAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "0303",
  143,
  "AMBAJIPETA (AMALAPURAM)"
 ],
 [
  "K014",
  143,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "6002",
  142,
  "DWARAKA TIRUMALA (BHIMADOLU)"
 ],
 [
  "2103",
  142,
  "R R PETA (ELURU)"
 ],
 [
  "0108",
  141,
  "KIRLAMPUDI (JAGGAMPETA)"
 ],
 [
  "4010",
  141,
  "RAMARAOPETA (KAKINADA)"
 ],
 [
  "0606",
  140,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "2210",
  140,
  "POOLAPALLI (PALAKOL)"
 ],
 [
  "8402",
  139,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "2908",
  139,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "2202",
  139,
  "KAJULURU (KARAPA)"
 ],
 [
  "00K1",
  135,
  "AUTONAGAR"
 ],
 [
  "3325",
  134,
  "INDRAPALEM (SARPAVARAM)"
 ],
 [
  "0207",
  134,
  "KAMANAGARUVU (AMALAPURAM)"
 ],
 [
  "3106",
  134,
  "SANTHI NAGAR (ELURU)"
 ],
 [
  "00K3",
  133,
  "KURMANNAPALEM (AUTONAGAR)"
 ],
 [
  "A103",
  133,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "0211",
  133,
  "KAMANAGARUVU (AMALAPURAM)"
 ],
 [
  "00C8",
  132,
  "CHINAGANTYADA (GAJUWAKA)"
 ],
 [
  "Y005",
  132,
  "SAGARNAGAR (MADHURAWADA)"
 ],
 [
  "0668",
  132,
  "YERNAGUDEM (GOPALAPURAM)"
 ],
 [
  "I904",
  131,
  "NARSIPATNAM"
 ],
 [
  "4110",
  131,
  "ANANTHAPALLI (NALLAJERLA)"
 ],
 [
  "P517",
  131,
  "PATHAPATNAM"
 ],
 [
  "0113",
  130,
  "ANAPARTHY"
 ],
 [
  "G401",
  130,
  "NELLIMARLA"
 ],
 [
  "0117",
  129,
  "KIRLAMPUDI (JAGGAMPETA)"
 ],
 [
  "1009",
  129,
  "VIJAYARAI (PEDAVEGI)"
 ],
 [
  "4102",
  129,
  "TANGELLAMUDI (DENDULURU)"
 ],
 [
  "0807",
  128,
  "PRATHIPADU"
 ],
 [
  "0206",
  127,
  "RAGHAVAPURAM (CHINTALAPUDI)"
 ],
 [
  "0402",
  127,
  "TADERU (PALAKODERU)"
 ],
 [
  "B210",
  126,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "M024",
  126,
  "PM PALEM (MADHURAWADA)"
 ],
 [
  "2501",
  126,
  "MANDAPETA"
 ],
 [
  "0503",
  125,
  "PITHAPURAM"
 ],
 [
  "4007",
  125,
  "DIARY FARM (KAKINADA)"
 ],
 [
  "2111",
  125,
  "R R PETA (ELURU)"
 ],
 [
  "2291",
  125,
  "SUJATHANAGAR (PENDURTHI)"
 ],
 [
  "1253",
  125,
  "GANGAVARAM-VSKP (MALKAPURAM)"
 ],
 [
  "5201",
  125,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "G701",
  125,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "0307",
  124,
  "RAZOLE"
 ],
 [
  "4108",
  124,
  "PORT (KAKINADA)"
 ],
 [
  "2203",
  124,
  "MUNAGAPAKA (KOTTURU)"
 ],
 [
  "2209",
  124,
  "RAYAVARAM (MANDAPETA)"
 ],
 [
  "3312",
  123,
  "PEDAPADU (DENDULURU)"
 ],
 [
  "2113",
  123,
  "R R PETA (ELURU)"
 ],
 [
  "0003",
  122,
  "KADIAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "0564",
  122,
  "GOPALAPURAM"
 ],
 [
  "1014",
  121,
  "NARSAPURAM"
 ],
 [
  "0635",
  121,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "6105",
  121,
  "POWERPET (ELURU)"
 ],
 [
  "5102",
  120,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "0174",
  120,
  "JAGGAMPETA"
 ],
 [
  "0237",
  119,
  "PALAKODERU"
 ],
 [
  "2212",
  119,
  "RAYAVARAM (MANDAPETA)"
 ],
 [
  "7702",
  118,
  "AGANAMPUDI"
 ],
 [
  "0225",
  118,
  "RAGHAVAPURAM (CHINTALAPUDI)"
 ],
 [
  "A105",
  117,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "0759",
  116,
  "KOYYALAGUDEM (POLAVARAM)"
 ],
 [
  "1016",
  116,
  "PEDAVEGI"
 ],
 [
  "0215",
  116,
  "KADIAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "R005",
  115,
  "V T AGRAHARAM (VIZIANAGARAM)"
 ],
 [
  "4111",
  115,
  "PORT (KAKINADA)"
 ],
 [
  "0804",
  115,
  "BAYYANNAGUDEM (POLAVARAM)"
 ],
 [
  "0903",
  115,
  "THONDANGI (TUNI)"
 ],
 [
  "4203",
  115,
  "MOGALTURU (NARSAPURAM)"
 ],
 [
  "T008",
  114,
  "CHITTIVALASA (BHEEMILI)"
 ],
 [
  "1002",
  114,
  "RAVULAPALEM (KOTHAPETA)"
 ],
 [
  "0756",
  114,
  "KOYYALAGUDEM (POLAVARAM)"
 ],
 [
  "0187",
  113,
  "CHAGALLU (KOVVURU)"
 ],
 [
  "0204",
  113,
  "MALLAYYAPETA (RAJAMAHENDRAVARAM)"
 ],
 [
  "8845",
  113,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "D008",
  113,
  "ATCHUTHAPURAM"
 ],
 [
  "2150",
  113,
  "GOPALAPATNAM"
 ],
 [
  "1356",
  113,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "4601",
  112,
  "KARAPA"
 ],
 [
  "C011",
  111,
  "MADHURAWADA"
 ],
 [
  "2289",
  111,
  "SUJATHANAGAR (PENDURTHI)"
 ],
 [
  "3107",
  111,
  "SANTHI NAGAR (ELURU)"
 ],
 [
  "2309",
  111,
  "DENDULURU"
 ],
 [
  "1007",
  110,
  "NARSAPURAM"
 ],
 [
  "2123",
  110,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "8002",
  110,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "A237",
  110,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "00C9",
  109,
  "CHINAGANTYADA (GAJUWAKA)"
 ],
 [
  "0197",
  109,
  "JAGGAMPETA"
 ],
 [
  "2159",
  109,
  "SIMHACHALAM (GOPALAPATNAM)"
 ],
 [
  "5231",
  109,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "0619",
  109,
  "TALLAPUDI (KOVVURU)"
 ],
 [
  "0110",
  108,
  "AMALAPURAM"
 ],
 [
  "P002",
  108,
  "BOBBILI"
 ],
 [
  "3003",
  108,
  "TETALI (TANUKU)"
 ],
 [
  "8405",
  108,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "0667",
  108,
  "YERNAGUDEM (GOPALAPURAM)"
 ],
 [
  "0238",
  107,
  "KORUKONDA"
 ],
 [
  "0122",
  107,
  "CHINTALAPUDI"
 ],
 [
  "M005",
  106,
  "MADUGULA"
 ],
 [
  "2701",
  105,
  "ACHANTA"
 ],
 [
  "0627",
  104,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "2902",
  104,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "B005",
  104,
  "BUTCHAYYAPETA (MADUGULA)"
 ],
 [
  "2292",
  104,
  "SUJATHANAGAR (PENDURTHI)"
 ],
 [
  "6309",
  104,
  "SATELLITE CITY (MORAMPUDI)"
 ],
 [
  "0119",
  103,
  "PURUSHOTHAPALLI (NIDADAVOLE)"
 ],
 [
  "0624",
  103,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "7106",
  103,
  "GOLLAGUDEM (UNGUTURU)"
 ],
 [
  "J301",
  103,
  "PONDURU (ETCHERLA)"
 ],
 [
  "6104",
  103,
  "BHAGYALAKSHMIPETA (TADEPALLIGUDEM)"
 ],
 [
  "2214",
  103,
  "KAJULURU (KARAPA)"
 ],
 [
  "3324",
  102,
  "INDRAPALEM (SARPAVARAM)"
 ],
 [
  "2154",
  102,
  "GOPALAPATNAM"
 ],
 [
  "0213",
  102,
  "KORUKONDA"
 ],
 [
  "2109",
  102,
  "R R PETA (ELURU)"
 ],
 [
  "2305",
  102,
  "DENDULURU"
 ],
 [
  "R128",
  101,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "2104",
  101,
  "RAMACHANDRAPURAM"
 ],
 [
  "4605",
  101,
  "KARAPA"
 ],
 [
  "0446",
  101,
  "TADERU (PALAKODERU)"
 ],
 [
  "1023",
  101,
  "ALAMURU (KOTHAPETA)"
 ],
 [
  "0714",
  100,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "A225",
  99,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "3047",
  99,
  "T-NARSAPURAM (KAMAVARAPUKOTA)"
 ],
 [
  "2217",
  99,
  "KAJULURU (KARAPA)"
 ],
 [
  "I250",
  99,
  "RANASTHALAM"
 ],
 [
  "0618",
  98,
  "TALLAPUDI (KOVVURU)"
 ],
 [
  "0515",
  98,
  "GUMMALURU (AKIVEEDU)"
 ],
 [
  "0418",
  98,
  "SANKHAVARAM (PRATHIPADU)"
 ],
 [
  "R094",
  98,
  "V T AGRAHARAM (VIZIANAGARAM)"
 ],
 [
  "3302",
  98,
  "PEDAPADU (DENDULURU)"
 ],
 [
  "0316",
  98,
  "RAZOLE"
 ],
 [
  "00K2",
  97,
  "KURMANNAPALEM (AUTONAGAR)"
 ],
 [
  "6106",
  97,
  "PODURU (PALAKOL)"
 ],
 [
  "1011",
  97,
  "NARSAPURAM"
 ],
 [
  "0742",
  96,
  "UNDI (AKIVEEDU)"
 ],
 [
  "5215",
  96,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "7013",
  95,
  "ATTILI (TANUKU)"
 ],
 [
  "1104",
  95,
  "KOTADIBBA (ELURU)"
 ],
 [
  "0803",
  95,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "1004",
  95,
  "PEDAVEGI"
 ],
 [
  "0413",
  95,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "6026",
  95,
  "DWARAKA TIRUMALA (BHIMADOLU)"
 ],
 [
  "P049",
  94,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "0312",
  94,
  "RAZOLE"
 ],
 [
  "00J1",
  94,
  "VADLAPUDI (AUTONAGAR)"
 ],
 [
  "5107",
  94,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "7114",
  94,
  "GOLLAGUDEM (UNGUTURU)"
 ],
 [
  "K716",
  94,
  "KOTABOMMALI"
 ],
 [
  "0297",
  93,
  "JAGGAMPETA"
 ],
 [
  "0514",
  93,
  "ANNAVARAM (TUNI)"
 ],
 [
  "6102",
  93,
  "SANTHI NAGAR (ELURU)"
 ],
 [
  "2608",
  93,
  "DWARAPUDI (MANDAPETA)"
 ],
 [
  "0234",
  93,
  "NEELADRIPURAM (PEDATADEPALLI)"
 ],
 [
  "4113",
  93,
  "PORT (KAKINADA)"
 ],
 [
  "0233",
  92,
  "PALAKODERU"
 ],
 [
  "C301",
  92,
  "GAJAPATHINAGARAM"
 ],
 [
  "0506",
  92,
  "GOKAVARAM (KORUKONDA)"
 ],
 [
  "0309",
  92,
  "RAZOLE"
 ],
 [
  "N045",
  92,
  "SANTAKAVITI (RAJAM)"
 ],
 [
  "0604",
  91,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "0666",
  91,
  "POLAVARAM"
 ],
 [
  "2284",
  90,
  "PENDURTHI"
 ],
 [
  "A101",
  89,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "B213",
  89,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "2162",
  89,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "7208",
  89,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "V028",
  89,
  "VSLNAGAR (MADHURAWADA)"
 ],
 [
  "0811",
  89,
  "BAYYANNAGUDEM (POLAVARAM)"
 ],
 [
  "P059",
  89,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "0658",
  88,
  "POLAVARAM"
 ],
 [
  "R086",
  88,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "V344",
  88,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "3326",
  88,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "R001",
  88,
  "VEERAGATTAM (PALAKONDA)"
 ],
 [
  "0406",
  88,
  "SAMPATHNAGARAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "00T1",
  88,
  "AUTONAGAR"
 ],
 [
  "P005",
  88,
  "BOBBILI"
 ],
 [
  "A003",
  88,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "A016",
  87,
  "ATCHUTHAPURAM"
 ],
 [
  "0035",
  87,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "4004",
  86,
  "DIARY FARM (KAKINADA)"
 ],
 [
  "8001",
  86,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "C008",
  86,
  "CHITTIVALASA (BHEEMILI)"
 ],
 [
  "00A1",
  85,
  "MINDI (GAJUWAKA)"
 ],
 [
  "4602",
  85,
  "KARAPA"
 ],
 [
  "A054",
  85,
  "ARILOVA (GOPALAPATNAM)"
 ],
 [
  "2213",
  85,
  "RAYAVARAM (MANDAPETA)"
 ],
 [
  "0719",
  85,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "R126",
  85,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "I905",
  85,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "0004",
  84,
  "MANDASA (PALASA)"
 ],
 [
  "2219",
  84,
  "POOLAPALLI (PALAKOL)"
 ],
 [
  "7135",
  84,
  "UNGUTURU"
 ],
 [
  "1111",
  83,
  "KOTADIBBA (ELURU)"
 ],
 [
  "0214",
  83,
  "KUNCHANAPALLI (PEDATADEPALLI)"
 ],
 [
  "1110",
  83,
  "KOTADIBBA (ELURU)"
 ],
 [
  "0127",
  83,
  "KALLA (AKIVEEDU)"
 ],
 [
  "0034",
  83,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "B115",
  83,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "S305",
  83,
  "RAMBADRAPURAM (BADANGI)"
 ],
 [
  "J010",
  82,
  "SAGARNAGAR (MADHURAWADA)"
 ],
 [
  "0205",
  82,
  "MUMMIDIVARAM"
 ],
 [
  "3115",
  82,
  "YELESWARAM (PRATHIPADU)"
 ],
 [
  "0921",
  82,
  "PRAKASHAM CHOWK (BHIMAVARAM)"
 ],
 [
  "1112",
  82,
  "KOTADIBBA (ELURU)"
 ],
 [
  "0242",
  82,
  "PALAKODERU"
 ],
 [
  "7214",
  81,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "0128",
  81,
  "KALLA (AKIVEEDU)"
 ],
 [
  "0634",
  81,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0609",
  81,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "2268",
  81,
  "SUJATHANAGAR (PENDURTHI)"
 ],
 [
  "V501",
  81,
  "JAMI (S.KOTA)"
 ],
 [
  "0310",
  81,
  "KOTHAPETA"
 ],
 [
  "1402",
  81,
  "ALLIPURAM (OLD CITY)"
 ],
 [
  "0505",
  80,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "1031",
  80,
  "PALAKOLE (PALAKOL)"
 ],
 [
  "3118",
  80,
  "YELESWARAM (PRATHIPADU)"
 ],
 [
  "G210",
  80,
  "DASANNAPETA (VIZIANAGARAM)"
 ],
 [
  "B326",
  80,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "4014",
  80,
  "UNDRAJAVARAM (NIDADAVOLE)"
 ],
 [
  "0160",
  80,
  "KATAKOTESWARAM (NIDADAVOLE)"
 ],
 [
  "R009",
  79,
  "SAGARNAGAR (MADHURAWADA)"
 ],
 [
  "4012",
  79,
  "UNDRAJAVARAM (NIDADAVOLE)"
 ],
 [
  "0153",
  79,
  "AMALAPURAM"
 ],
 [
  "K007",
  79,
  "BHEEMILI"
 ],
 [
  "2215",
  79,
  "MUNAGAPAKA (KOTTURU)"
 ],
 [
  "B303",
  79,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "2801",
  79,
  "PODURU (PALAKOL)"
 ],
 [
  "3005",
  79,
  "TETALI (TANUKU)"
 ],
 [
  "2039",
  79,
  "BHIMADOLU"
 ],
 [
  "1047",
  79,
  "VIJAYARAI (PEDAVEGI)"
 ],
 [
  "2156",
  78,
  "GOPALAPATNAM"
 ],
 [
  "00K5",
  78,
  "KURMANNAPALEM (AUTONAGAR)"
 ],
 [
  "A027",
  78,
  "ARILOVA (GOPALAPATNAM)"
 ],
 [
  "0722",
  78,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "0324",
  78,
  "RAJANAGARAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "3109",
  77,
  "TETALI (TANUKU)"
 ],
 [
  "5205",
  77,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "A107",
  77,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "2211",
  77,
  "RAYAVARAM (MANDAPETA)"
 ],
 [
  "S351",
  76,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "0626",
  76,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "3108",
  76,
  "SANTHI NAGAR (ELURU)"
 ],
 [
  "0509",
  76,
  "ANNAVARAM (TUNI)"
 ],
 [
  "3327",
  76,
  "INDRAPALEM (SARPAVARAM)"
 ],
 [
  "4115",
  76,
  "PORT (KAKINADA)"
 ],
 [
  "0170",
  76,
  "RANGAMPETA (ANAPARTHY)"
 ],
 [
  "0100",
  76,
  "PARVATHIPURAM"
 ],
 [
  "0209",
  76,
  "KOTANANDURU (TUNI)"
 ],
 [
  "V009",
  75,
  "VENKANNAPALEM (CHODAVARAM)"
 ],
 [
  "8841",
  75,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "2272",
  75,
  "SUJATHANAGAR (PENDURTHI)"
 ],
 [
  "2609",
  75,
  "DWARAPUDI (MANDAPETA)"
 ],
 [
  "K002",
  75,
  "MADUGULA"
 ],
 [
  "5204",
  75,
  "GUMMALURU (AKIVEEDU)"
 ],
 [
  "0231",
  75,
  "RAGHAVAPURAM (CHINTALAPUDI)"
 ],
 [
  "B021",
  74,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "C312",
  74,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "0508",
  74,
  "THONDANGI (TUNI)"
 ],
 [
  "0118",
  74,
  "PEDAPUDI (KARAPA)"
 ],
 [
  "A108",
  74,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "4617",
  74,
  "KARAPA"
 ],
 [
  "0221",
  74,
  "KORUKONDA"
 ],
 [
  "I418",
  74,
  "ETCHERLA"
 ],
 [
  "0622",
  73,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0710",
  73,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "2320",
  73,
  "DENDULURU"
 ],
 [
  "0527",
  73,
  "LAKKAVARAM (JANGAREDDYGUDEM)"
 ],
 [
  "1160",
  73,
  "MALKAPURAM"
 ],
 [
  "2307",
  73,
  "DENDULURU"
 ],
 [
  "5005",
  73,
  "PERAVALI (NIDADAVOLE)"
 ],
 [
  "A204",
  73,
  "PEDAWALTAIR (WALTAIR)"
 ],
 [
  "A008",
  73,
  "CHODAVARAM"
 ],
 [
  "2807",
  72,
  "PODURU (PALAKOL)"
 ],
 [
  "8895",
  72,
  "JNPC-PARAWADA"
 ],
 [
  "3210",
  72,
  "SITARAMAPURAM (NARSAPURAM)"
 ],
 [
  "0315",
  72,
  "RAZOLE"
 ],
 [
  "P019",
  72,
  "PM PALEM (MADHURAWADA)"
 ],
 [
  "0259",
  72,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "W002",
  72,
  "BUTCHAYYAPETA (MADUGULA)"
 ],
 [
  "0121",
  72,
  "KIRLAMPUDI (JAGGAMPETA)"
 ],
 [
  "0224",
  72,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "0232",
  72,
  "NEELADRIPURAM (PEDATADEPALLI)"
 ],
 [
  "3114",
  72,
  "SITARAMAPURAM (NARSAPURAM)"
 ],
 [
  "B212",
  72,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "0218",
  72,
  "RAGHAVAPURAM (CHINTALAPUDI)"
 ],
 [
  "2115",
  72,
  "RAMACHANDRAPURAM"
 ],
 [
  "5007",
  71,
  "PEDDAPURAM (SAMALKOTA)"
 ],
 [
  "2152",
  71,
  "SIMHACHALAM (GOPALAPATNAM)"
 ],
 [
  "3816",
  71,
  "MURALINAGAR (KANCHARAPALEM)"
 ],
 [
  "00K4",
  71,
  "KURMANNAPALEM (AUTONAGAR)"
 ],
 [
  "M015",
  71,
  "MADHURAWADA"
 ],
 [
  "1008",
  71,
  "ETHAKOTA (KOTHAPETA)"
 ],
 [
  "6641",
  71,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "7202",
  70,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "2270",
  70,
  "PENDURTHI"
 ],
 [
  "0308",
  70,
  "PRATHIPADU"
 ],
 [
  "R118",
  70,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "3007",
  70,
  "TETALI (TANUKU)"
 ],
 [
  "K401",
  70,
  "KURUPAM (KURUPAM ITDA)"
 ],
 [
  "1010",
  70,
  "ETHAKOTA (KOTHAPETA)"
 ],
 [
  "4009",
  70,
  "RANGAPURAM (PEDAVEGI)"
 ],
 [
  "0171",
  70,
  "CHAGALLU (KOVVURU)"
 ],
 [
  "0835",
  69,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "4015",
  69,
  "UNDRAJAVARAM (NIDADAVOLE)"
 ],
 [
  "6613",
  69,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "M106",
  69,
  "BODDAM (RAJAM)"
 ],
 [
  "R092",
  69,
  "V T AGRAHARAM (VIZIANAGARAM)"
 ],
 [
  "2304",
  68,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "M025",
  68,
  "KOMMADI (MADHURAWADA)"
 ],
 [
  "3004",
  68,
  "TETALI (TANUKU)"
 ],
 [
  "0217",
  68,
  "KORUKONDA"
 ],
 [
  "1751",
  68,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "1201",
  68,
  "BHAGYALAKSHMIPETA (TADEPALLIGUDEM)"
 ],
 [
  "0615",
  68,
  "TALLAPUDI (KOVVURU)"
 ],
 [
  "0146",
  68,
  "PENTAPADU (TADEPALLIGUDEM)"
 ],
 [
  "0703",
  68,
  "KATRENIKONA (MUMMIDIVARAM)"
 ],
 [
  "2124",
  68,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "0404",
  67,
  "JANGAREDDYGUDEM"
 ],
 [
  "P041",
  67,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "0812",
  67,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0162",
  67,
  "RANGAMPETA (ANAPARTHY)"
 ],
 [
  "2506",
  67,
  "YEDIDA (MANDAPETA)"
 ],
 [
  "2172",
  67,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "5526",
  67,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "6302",
  67,
  "SATELLITE CITY (MORAMPUDI)"
 ],
 [
  "0311",
  67,
  "VEERAVASARAM (PALAKODERU)"
 ],
 [
  "A002",
  67,
  "ANANDAPURAM"
 ],
 [
  "7306",
  66,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "0182",
  66,
  "JAGGAMPETA"
 ],
 [
  "0613",
  66,
  "AKIVEEDU"
 ],
 [
  "G101",
  66,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "0809",
  66,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "R087",
  66,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "5002",
  66,
  "RANGAPURAM (PEDAVEGI)"
 ],
 [
  "A201",
  66,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "0156",
  66,
  "AMALAPURAM"
 ],
 [
  "V330",
  66,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "B211",
  66,
  "BHAMINI (PALAKONDA)"
 ],
 [
  "3352",
  66,
  "PEDAPADU (DENDULURU)"
 ],
 [
  "1017",
  66,
  "ALAMURU (KOTHAPETA)"
 ],
 [
  "0288",
  65,
  "KANCHILI (SOMPETA)"
 ],
 [
  "0757",
  65,
  "KOTANANDURU (TUNI)"
 ],
 [
  "J092",
  65,
  "AMADALAVALASA"
 ],
 [
  "0208",
  65,
  "MUMMIDIVARAM"
 ],
 [
  "A233",
  65,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "1251",
  65,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "0022",
  65,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "7302",
  64,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "V026",
  64,
  "VSLNAGAR (MADHURAWADA)"
 ],
 [
  "0219",
  64,
  "KAMANAGARUVU (AMALAPURAM)"
 ],
 [
  "J097",
  64,
  "AMADALAVALASA"
 ],
 [
  "A251",
  64,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "G103",
  64,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "1035",
  64,
  "VIJAYARAI (PEDAVEGI)"
 ],
 [
  "5210",
  64,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "N009",
  63,
  "MADHURAWADA"
 ],
 [
  "4829",
  63,
  "TALLAREVU (KARAPA)"
 ],
 [
  "0640",
  63,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "0708",
  63,
  "KATRENIKONA (MUMMIDIVARAM)"
 ],
 [
  "0510",
  63,
  "MAMIDIKUDURU (RAZOLE)"
 ],
 [
  "6305",
  63,
  "SATELLITE CITY (MORAMPUDI)"
 ],
 [
  "4011",
  63,
  "RAMARAOPETA (KAKINADA)"
 ],
 [
  "T003",
  63,
  "CHITTIVALASA (BHEEMILI)"
 ],
 [
  "6637",
  63,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "6620",
  63,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "G104",
  63,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "0031",
  62,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "4801",
  62,
  "TALLAREVU (KARAPA)"
 ],
 [
  "B251",
  62,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "3307",
  62,
  "PRATAPNAGAR (SARPAVARAM)"
 ],
 [
  "1021",
  62,
  "VIJAYARAI (PEDAVEGI)"
 ],
 [
  "A006",
  62,
  "THATITURU (BHEEMILI)"
 ],
 [
  "2811",
  62,
  "PODURU (PALAKOL)"
 ],
 [
  "2205",
  61,
  "POOLAPALLI (PALAKOL)"
 ],
 [
  "3202",
  61,
  "SITARAMAPURAM (NARSAPURAM)"
 ],
 [
  "1754",
  61,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "R025",
  61,
  "V T AGRAHARAM (VIZIANAGARAM)"
 ],
 [
  "A102",
  61,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "0266",
  61,
  "MANDASA (PALASA)"
 ],
 [
  "4106",
  61,
  "PORT (KAKINADA)"
 ],
 [
  "V497",
  61,
  "S.KOTA"
 ],
 [
  "0012",
  61,
  "MURAMANDA (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "G107",
  61,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "0321",
  61,
  "RAZOLE"
 ],
 [
  "0712",
  60,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "2208",
  60,
  "MUNAGAPAKA (KOTTURU)"
 ],
 [
  "2324",
  60,
  "DENDULURU"
 ],
 [
  "0405",
  60,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "R031",
  60,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "B205",
  60,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "2151",
  60,
  "GOPALAPATNAM"
 ],
 [
  "M022",
  60,
  "ATCHUTHAPURAM"
 ],
 [
  "7023",
  60,
  "ATTILI (TANUKU)"
 ],
 [
  "2315",
  60,
  "DENDULURU"
 ],
 [
  "4830",
  59,
  "TALLAREVU (KARAPA)"
 ],
 [
  "6306",
  59,
  "SATELLITE CITY (MORAMPUDI)"
 ],
 [
  "0008",
  59,
  "MURAMANDA (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "7773",
  59,
  "AGANAMPUDI"
 ],
 [
  "4112",
  59,
  "PORT (KAKINADA)"
 ],
 [
  "2601",
  59,
  "DWARAPUDI (MANDAPETA)"
 ],
 [
  "0421",
  59,
  "MANDASA (PALASA)"
 ],
 [
  "B282",
  59,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "2806",
  59,
  "PODURU (PALAKOL)"
 ],
 [
  "2207",
  59,
  "RAYAVARAM (MANDAPETA)"
 ],
 [
  "0443",
  58,
  "TADERU (PALAKODERU)"
 ],
 [
  "0409",
  58,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "8022",
  58,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "1012",
  58,
  "PALAKOLE (PALAKOL)"
 ],
 [
  "0555",
  58,
  "GOPALAPURAM"
 ],
 [
  "1211",
  58,
  "AKKAYYAPALEM (DONDAPARTHY)"
 ],
 [
  "0610",
  58,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "4114",
  58,
  "MOGALTURU (NARSAPURAM)"
 ],
 [
  "0831",
  58,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "A055",
  58,
  "ARILOVA (GOPALAPATNAM)"
 ],
 [
  "0532",
  58,
  "AKIVEEDU"
 ],
 [
  "2913",
  58,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "4202",
  58,
  "MOGALTURU (NARSAPURAM)"
 ],
 [
  "V002",
  58,
  "BUTCHAYYAPETA (MADUGULA)"
 ],
 [
  "0611",
  58,
  "TALLAPUDI (KOVVURU)"
 ],
 [
  "P384",
  57,
  "SEETAMPETA (PALAKONDA)"
 ],
 [
  "G218",
  57,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "A226",
  57,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "R035",
  57,
  "V T AGRAHARAM (VIZIANAGARAM)"
 ],
 [
  "K044",
  57,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "V004",
  57,
  "ANANDAPURAM"
 ],
 [
  "P031",
  57,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "0320",
  57,
  "KAMAVARAPUKOTA"
 ],
 [
  "B101",
  57,
  "BHOGAPURAM"
 ],
 [
  "0155",
  57,
  "KATAKOTESWARAM (NIDADAVOLE)"
 ],
 [
  "B006",
  57,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "0752",
  57,
  "UPPALAGUPTAM (MUMMIDIVARAM)"
 ],
 [
  "5501",
  57,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "0525",
  56,
  "ANNAVARAM (TUNI)"
 ],
 [
  "J091",
  56,
  "AMADALAVALASA"
 ],
 [
  "7517",
  56,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "H829",
  56,
  "NATHAVARAM"
 ],
 [
  "3316",
  56,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "0408",
  56,
  "ATREYAPURAM (KOTHAPETA)"
 ],
 [
  "S605",
  56,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "0806",
  56,
  "PRATHIPADU"
 ],
 [
  "0154",
  56,
  "AMALAPURAM"
 ],
 [
  "2322",
  56,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "0612",
  56,
  "MALKIPURAM (RAZOLE)"
 ],
 [
  "I411",
  56,
  "ETCHERLA"
 ],
 [
  "7906",
  56,
  "KONTHAMURU (RAJAMAHENDRAVARAM)"
 ],
 [
  "0473",
  56,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "00V3",
  55,
  "VADLAPUDI (AUTONAGAR)"
 ],
 [
  "5004",
  55,
  "PEDDAPURAM (SAMALKOTA)"
 ],
 [
  "0411",
  55,
  "SANKHAVARAM (PRATHIPADU)"
 ],
 [
  "00J2",
  55,
  "MINDI (GAJUWAKA)"
 ],
 [
  "0314",
  55,
  "KAMAVARAPUKOTA"
 ],
 [
  "R093",
  55,
  "V T AGRAHARAM (VIZIANAGARAM)"
 ],
 [
  "0226",
  55,
  "BUTTAIGUDEM (POLAVARAM)"
 ],
 [
  "2019",
  55,
  "BHIMADOLU"
 ],
 [
  "2814",
  55,
  "PODURU (PALAKOL)"
 ],
 [
  "1019",
  55,
  "VIJAYARAI (PEDAVEGI)"
 ],
 [
  "0631",
  54,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "V491",
  54,
  "S.KOTA"
 ],
 [
  "0414",
  54,
  "INAVALLI (AMALAPURAM)"
 ],
 [
  "7215",
  54,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "0814",
  54,
  "UNDI (AKIVEEDU)"
 ],
 [
  "3818",
  54,
  "MURALINAGAR (KANCHARAPALEM)"
 ],
 [
  "G204",
  54,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "B257",
  54,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "0417",
  54,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "0560",
  54,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "S001",
  54,
  "CHITTIVALASA (BHEEMILI)"
 ],
 [
  "B278",
  54,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "2708",
  54,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "2907",
  54,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "A200",
  53,
  "P.N.COLONY (SRIKAKULAM)"
 ],
 [
  "V315",
  53,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "4016",
  53,
  "LINGAPALEM (PEDAVEGI)"
 ],
 [
  "2177",
  53,
  "SIMHACHALAM (GOPALAPATNAM)"
 ],
 [
  "0158",
  53,
  "RANGAMPETA (ANAPARTHY)"
 ],
 [
  "3332",
  53,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "0285",
  53,
  "VEERAVASARAM (PALAKODERU)"
 ],
 [
  "2276",
  53,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "0132",
  53,
  "KALLA (AKIVEEDU)"
 ],
 [
  "6007",
  53,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "0420",
  53,
  "INAVALLI (AMALAPURAM)"
 ],
 [
  "J096",
  53,
  "AMADALAVALASA"
 ],
 [
  "N003",
  53,
  "THATITURU (BHEEMILI)"
 ],
 [
  "L004",
  53,
  "PM PALEM (MADHURAWADA)"
 ],
 [
  "S206",
  53,
  "BADANGI"
 ],
 [
  "6003",
  52,
  "DWARAKA TIRUMALA (BHIMADOLU)"
 ],
 [
  "0184",
  52,
  "JAGGAMPETA"
 ],
 [
  "C014",
  52,
  "K.KOTAPADU (CHODAVARAM)"
 ],
 [
  "0005",
  52,
  "KADIAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "2285",
  52,
  "SUJATHANAGAR (PENDURTHI)"
 ],
 [
  "B506",
  52,
  "MVP (WALTAIR)"
 ],
 [
  "4622",
  52,
  "KARAPA"
 ],
 [
  "0630",
  51,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "V498",
  51,
  "S.KOTA"
 ],
 [
  "0157",
  51,
  "RANGAMPETA (ANAPARTHY)"
 ],
 [
  "2160",
  51,
  "SIMHACHALAM (GOPALAPATNAM)"
 ],
 [
  "G314",
  51,
  "RAVIKAMATAM (MADUGULA)"
 ],
 [
  "0524",
  51,
  "LAKKAVARAM (JANGAREDDYGUDEM)"
 ],
 [
  "R011",
  51,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "A234",
  51,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "P206",
  51,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "4207",
  51,
  "MOGALTURU (NARSAPURAM)"
 ],
 [
  "J093",
  51,
  "AMADALAVALASA"
 ],
 [
  "0223",
  50,
  "MUMMIDIVARAM"
 ],
 [
  "6014",
  50,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "0124",
  50,
  "PEDAPUDI (KARAPA)"
 ],
 [
  "R107",
  50,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "P004",
  50,
  "BOBBILI"
 ],
 [
  "A053",
  50,
  "ARILOVA (GOPALAPATNAM)"
 ],
 [
  "0512",
  50,
  "THONDANGI (TUNI)"
 ],
 [
  "I555",
  50,
  "P.N.COLONY (SRIKAKULAM)"
 ],
 [
  "3308",
  50,
  "PRATAPNAGAR (SARPAVARAM)"
 ],
 [
  "L001",
  50,
  "THATITURU (BHEEMILI)"
 ],
 [
  "S401",
  50,
  "MAKKUVA (SALURU)"
 ],
 [
  "0011",
  50,
  "MURAMANDA (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "G301",
  50,
  "RAVIKAMATAM (MADUGULA)"
 ],
 [
  "1205",
  50,
  "ALLIPURAM (OLD CITY)"
 ],
 [
  "R127",
  50,
  "VEERAGATTAM (PALAKONDA)"
 ],
 [
  "3355",
  50,
  "PEDAPADU (DENDULURU)"
 ],
 [
  "R124",
  49,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "2220",
  49,
  "KAJULURU (KARAPA)"
 ],
 [
  "7502",
  49,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "G504",
  49,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "0194",
  49,
  "JAGGAMPETA"
 ],
 [
  "0120",
  49,
  "KIRLAMPUDI (JAGGAMPETA)"
 ],
 [
  "2602",
  49,
  "DWARAPUDI (MANDAPETA)"
 ],
 [
  "0173",
  49,
  "CHAGALLU (KOVVURU)"
 ],
 [
  "00N1",
  49,
  "MINDI (GAJUWAKA)"
 ],
 [
  "0568",
  49,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "P011",
  49,
  "ANANDAPURAM"
 ],
 [
  "0139",
  49,
  "PENTAPADU (TADEPALLIGUDEM)"
 ],
 [
  "S071",
  49,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "7122",
  49,
  "UNGUTURU"
 ],
 [
  "7003",
  49,
  "ATTILI (TANUKU)"
 ],
 [
  "3201",
  48,
  "NGOS COLONY (TANUKU)"
 ],
 [
  "0000",
  48,
  "SIRIPURAM (WALTAIR)"
 ],
 [
  "0810",
  48,
  "UNDI (AKIVEEDU)"
 ],
 [
  "1287",
  48,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "1119",
  48,
  "GANAPAVARAM (PEDATADEPALLI)"
 ],
 [
  "N002",
  48,
  "CHODAVARAM"
 ],
 [
  "M036",
  48,
  "MADDILAPALEM (SEETHAMMADHARA)"
 ],
 [
  "G114",
  48,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "0769",
  48,
  "UPPALAGUPTAM (MUMMIDIVARAM)"
 ],
 [
  "7902",
  48,
  "KONTHAMURU (RAJAMAHENDRAVARAM)"
 ],
 [
  "0346",
  48,
  "RAJANAGARAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "0175",
  48,
  "JAGGAMPETA"
 ],
 [
  "6621",
  48,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "B215",
  48,
  "BHAMINI (PALAKONDA)"
 ],
 [
  "0717",
  47,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "R083",
  47,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "00MG",
  47,
  "MINDI (GAJUWAKA)"
 ],
 [
  "1108",
  47,
  "GANAPAVARAM (PEDATADEPALLI)"
 ],
 [
  "0534",
  47,
  "AKIVEEDU"
 ],
 [
  "S203",
  47,
  "GARA (SRIKAKULAM)"
 ],
 [
  "G106",
  47,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "B209",
  47,
  "BHAMINI (PALAKONDA)"
 ],
 [
  "2910",
  47,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "2225",
  47,
  "POOLAPALLI (PALAKOL)"
 ],
 [
  "7026",
  47,
  "M NAGULAPALLI (BHIMADOLU)"
 ],
 [
  "0558",
  47,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "0567",
  47,
  "GOPALAPURAM"
 ],
 [
  "0465",
  47,
  "TADUVAI (JANGAREDDYGUDEM)"
 ],
 [
  "0227",
  47,
  "RAGHAVAPURAM (CHINTALAPUDI)"
 ],
 [
  "2107",
  47,
  "NIDAMARRU (UNGUTURU)"
 ],
 [
  "2265",
  47,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "H821",
  47,
  "NATHAVARAM"
 ],
 [
  "6001",
  47,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "0416",
  47,
  "INAVALLI (AMALAPURAM)"
 ],
 [
  "0535",
  47,
  "GOKAVARAM (KORUKONDA)"
 ],
 [
  "7018",
  47,
  "ATTILI (TANUKU)"
 ],
 [
  "0009",
  47,
  "KADIAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "2153",
  46,
  "SIMHACHALAM (GOPALAPATNAM)"
 ],
 [
  "0617",
  46,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "3831",
  46,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "0518",
  46,
  "KURMANNAPALEM (AUTONAGAR)"
 ],
 [
  "7021",
  46,
  "ATTILI (TANUKU)"
 ],
 [
  "7102",
  46,
  "GOLLAGUDEM (UNGUTURU)"
 ],
 [
  "0523",
  46,
  "GUMMALURU (AKIVEEDU)"
 ],
 [
  "7019",
  46,
  "ATTILI (TANUKU)"
 ],
 [
  "0407",
  46,
  "ATREYAPURAM (KOTHAPETA)"
 ],
 [
  "1041",
  46,
  "VIJAYARAI (PEDAVEGI)"
 ],
 [
  "0161",
  46,
  "KATAKOTESWARAM (NIDADAVOLE)"
 ],
 [
  "7010",
  46,
  "M NAGULAPALLI (BHIMADOLU)"
 ],
 [
  "2037",
  46,
  "BHIMADOLU"
 ],
 [
  "6013",
  46,
  "DWARAKA TIRUMALA (BHIMADOLU)"
 ],
 [
  "D018",
  46,
  "ANAKAPALLI (ANAKAPALLE)"
 ],
 [
  "R119",
  46,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "P039",
  46,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "9310",
  46,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "0721",
  45,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "J086",
  45,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "2254",
  45,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "0582",
  45,
  "GOPALAPURAM"
 ],
 [
  "A007",
  45,
  "KONDAKARLA (ATCHUTHAPURAM)"
 ],
 [
  "3320",
  45,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "S602",
  45,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "M003",
  45,
  "BHEEMILI"
 ],
 [
  "0246",
  45,
  "PALAKODERU"
 ],
 [
  "1022",
  45,
  "TANUKU"
 ],
 [
  "0519",
  45,
  "GOKAVARAM (KORUKONDA)"
 ],
 [
  "6016",
  45,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "V241",
  45,
  "L.KOTA (S.KOTA)"
 ],
 [
  "2310",
  45,
  "DENDULURU"
 ],
 [
  "J094",
  45,
  "AMADALAVALASA"
 ],
 [
  "0602",
  44,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "B012",
  44,
  "MADHURAWADA"
 ],
 [
  "P026",
  44,
  "KONDAKARLA (ATCHUTHAPURAM)"
 ],
 [
  "I426",
  44,
  "ETCHERLA"
 ],
 [
  "A235",
  44,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "M026",
  44,
  "MADDILAPALEM (SEETHAMMADHARA)"
 ],
 [
  "0563",
  44,
  "GOPALAPURAM"
 ],
 [
  "6107",
  44,
  "POWERPET (ELURU)"
 ],
 [
  "0574",
  44,
  "GOPALAPURAM"
 ],
 [
  "2267",
  44,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "5013",
  44,
  "PERAVALI (NIDADAVOLE)"
 ],
 [
  "0412",
  44,
  "SANKHAVARAM (PRATHIPADU)"
 ],
 [
  "0240",
  44,
  "KORUKONDA"
 ],
 [
  "5235",
  44,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "0334",
  44,
  "KAMAVARAPUKOTA"
 ],
 [
  "D032",
  43,
  "DONDAPARTHY"
 ],
 [
  "M016",
  43,
  "MADHURAWADA"
 ],
 [
  "3329",
  43,
  "INDRAPALEM (SARPAVARAM)"
 ],
 [
  "2121",
  43,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "0616",
  43,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "2108",
  43,
  "RAMACHANDRAPURAM"
 ],
 [
  "G003",
  43,
  "VENKANNAPALEM (CHODAVARAM)"
 ],
 [
  "0663",
  43,
  "PALASA"
 ],
 [
  "G310",
  43,
  "RAVIKAMATAM (MADUGULA)"
 ],
 [
  "1116",
  43,
  "GANAPAVARAM (PEDATADEPALLI)"
 ],
 [
  "0051",
  43,
  "SOMPETA"
 ],
 [
  "0326",
  43,
  "RAJANAGARAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "7025",
  43,
  "ATTILI (TANUKU)"
 ],
 [
  "0608",
  43,
  "KOTHAPETA"
 ],
 [
  "1157",
  43,
  "MALKAPURAM"
 ],
 [
  "0195",
  42,
  "JAGGAMPETA"
 ],
 [
  "6004",
  42,
  "DWARAKA TIRUMALA (BHIMADOLU)"
 ],
 [
  "7015",
  42,
  "M NAGULAPALLI (BHIMADOLU)"
 ],
 [
  "7022",
  42,
  "ATTILI (TANUKU)"
 ],
 [
  "3817",
  42,
  "MURALINAGAR (KANCHARAPALEM)"
 ],
 [
  "2102",
  42,
  "R R PETA (ELURU)"
 ],
 [
  "1025",
  42,
  "VIJAYARAI (PEDAVEGI)"
 ],
 [
  "2317",
  42,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "B706",
  42,
  "MVP (WALTAIR)"
 ],
 [
  "M130",
  42,
  "BODDAM (RAJAM)"
 ],
 [
  "0247",
  42,
  "PALAKODERU"
 ],
 [
  "I141",
  42,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "M035",
  42,
  "MADDILAPALEM (SEETHAMMADHARA)"
 ],
 [
  "A227",
  42,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "0125",
  42,
  "KALLA (AKIVEEDU)"
 ],
 [
  "V495",
  42,
  "S.KOTA"
 ],
 [
  "1015",
  42,
  "ALAMURU (KOTHAPETA)"
 ],
 [
  "B203",
  42,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "5018",
  42,
  "PERAVALI (NIDADAVOLE)"
 ],
 [
  "A005",
  42,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "K049",
  42,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "4903",
  41,
  "SAMALKOTA"
 ],
 [
  "0142",
  41,
  "PENTAPADU (TADEPALLIGUDEM)"
 ],
 [
  "0838",
  41,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0317",
  41,
  "TADIKALAPUDI (KAMAVARAPUKOTA)"
 ],
 [
  "G001",
  41,
  "SAGARNAGAR (MADHURAWADA)"
 ],
 [
  "2277",
  41,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "A018",
  41,
  "SEETHAMMADHARA"
 ],
 [
  "S601",
  41,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "A906",
  41,
  "MVP (WALTAIR)"
 ],
 [
  "1716",
  41,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "0336",
  41,
  "KAVITI (SOMPETA)"
 ],
 [
  "0726",
  41,
  "UNDI (AKIVEEDU)"
 ],
 [
  "G203",
  41,
  "DASANNAPETA (VIZIANAGARAM)"
 ],
 [
  "3331",
  41,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "7912",
  41,
  "KONTHAMURU (RAJAMAHENDRAVARAM)"
 ],
 [
  "0559",
  41,
  "GOPALAPURAM"
 ],
 [
  "0516",
  41,
  "GUMMALURU (AKIVEEDU)"
 ],
 [
  "V520",
  41,
  "JAMI (S.KOTA)"
 ],
 [
  "G322",
  41,
  "GURLA (NELLIMARLA)"
 ],
 [
  "K003",
  41,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "0241",
  41,
  "NEELADRIPURAM (PEDATADEPALLI)"
 ],
 [
  "2505",
  41,
  "YEDIDA (MANDAPETA)"
 ],
 [
  "0603",
  40,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "H001",
  40,
  "KONDAKARLA (ATCHUTHAPURAM)"
 ],
 [
  "C307",
  40,
  "GAJAPATHINAGARAM"
 ],
 [
  "1154",
  40,
  "SRIHARIPURAM (MALKAPURAM)"
 ],
 [
  "1020",
  40,
  "ALAMURU (KOTHAPETA)"
 ],
 [
  "2218",
  40,
  "KAJULURU (KARAPA)"
 ],
 [
  "2007",
  40,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "3348",
  40,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "0815",
  40,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "C101",
  40,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "1102",
  40,
  "KASIMKOTA"
 ],
 [
  "A037",
  40,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "0802",
  39,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "G505",
  39,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "R041",
  39,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "B304",
  39,
  "PEDAWALTAIR (WALTAIR)"
 ],
 [
  "0575",
  39,
  "GOPALAPURAM"
 ],
 [
  "4303",
  39,
  "JAGANNAICKPUR (SARPAVARAM)"
 ],
 [
  "7318",
  39,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "0272",
  39,
  "VEERAVASARAM (PALAKODERU)"
 ],
 [
  "B013",
  39,
  "KOMMADI (MADHURAWADA)"
 ],
 [
  "7321",
  39,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "0660",
  39,
  "YERNAGUDEM (GOPALAPURAM)"
 ],
 [
  "V217",
  39,
  "L.KOTA (S.KOTA)"
 ],
 [
  "2513",
  39,
  "MANDAPETA"
 ],
 [
  "0655",
  39,
  "SAKHINETIPALLI (RAZOLE)"
 ],
 [
  "7002",
  38,
  "ATTILI (TANUKU)"
 ],
 [
  "0530",
  38,
  "THONDANGI (TUNI)"
 ],
 [
  "4504",
  38,
  "GYGOLAPADU (SARPAVARAM)"
 ],
 [
  "0632",
  38,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "2702",
  38,
  "ACHANTA"
 ],
 [
  "R082",
  38,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "1355",
  38,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "3208",
  38,
  "SITARAMAPURAM (NARSAPURAM)"
 ],
 [
  "I407",
  38,
  "ETCHERLA"
 ],
 [
  "7905",
  38,
  "KONTHAMURU (RAJAMAHENDRAVARAM)"
 ],
 [
  "6027",
  38,
  "DWARAKA TIRUMALA (BHIMADOLU)"
 ],
 [
  "0457",
  38,
  "TADUVAI (JANGAREDDYGUDEM)"
 ],
 [
  "4008",
  38,
  "UNDRAJAVARAM (NIDADAVOLE)"
 ],
 [
  "R115",
  38,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "8869",
  38,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "S212",
  38,
  "GARA (SRIKAKULAM)"
 ],
 [
  "1029",
  38,
  "VIJAYARAI (PEDAVEGI)"
 ],
 [
  "B102",
  38,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "4505",
  37,
  "GYGOLAPADU (SARPAVARAM)"
 ],
 [
  "B230",
  37,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "HB01",
  37,
  "HB COLONY (SEETHAMMADHARA)"
 ],
 [
  "1209",
  37,
  "AKKAYYAPALEM (DONDAPARTHY)"
 ],
 [
  "00S2",
  37,
  "MINDI (GAJUWAKA)"
 ],
 [
  "0179",
  37,
  "CHAGALLU (KOVVURU)"
 ],
 [
  "0533",
  37,
  "THONDANGI (TUNI)"
 ],
 [
  "M008",
  37,
  "VENKANNAPALEM (CHODAVARAM)"
 ],
 [
  "7305",
  37,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "A009",
  37,
  "CHEEDIKADA (MADUGULA)"
 ],
 [
  "0561",
  37,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "K008",
  37,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "C315",
  37,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "0763",
  37,
  "KOYYALAGUDEM (POLAVARAM)"
 ],
 [
  "7109",
  37,
  "GOLLAGUDEM (UNGUTURU)"
 ],
 [
  "0164",
  37,
  "AMALAPURAM"
 ],
 [
  "V504",
  37,
  "JAMI (S.KOTA)"
 ],
 [
  "0444",
  37,
  "TADERU (PALAKODERU)"
 ],
 [
  "7020",
  37,
  "ATTILI (TANUKU)"
 ],
 [
  "0027",
  37,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "1407",
  37,
  "KANCHARAPALEM"
 ],
 [
  "0713",
  36,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "0620",
  36,
  "MALKIPURAM (RAZOLE)"
 ],
 [
  "7503",
  36,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "2278",
  36,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "G509",
  36,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "7213",
  36,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "S208",
  36,
  "GARA (SRIKAKULAM)"
 ],
 [
  "3318",
  36,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "V441",
  36,
  "S.KOTA"
 ],
 [
  "1767",
  36,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "D006",
  36,
  "DEVARAPALLI (CHODAVARAM)"
 ],
 [
  "5218",
  36,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "4017",
  36,
  "RANGAPURAM (PEDAVEGI)"
 ],
 [
  "A004",
  36,
  "THATITURU (BHEEMILI)"
 ],
 [
  "S202",
  36,
  "BALIJIPETA (PARVATHIPURAM)"
 ],
 [
  "I921",
  36,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "1120",
  36,
  "GANAPAVARAM (PEDATADEPALLI)"
 ],
 [
  "2118",
  36,
  "NIDAMARRU (UNGUTURU)"
 ],
 [
  "0236",
  36,
  "PALAKODERU"
 ],
 [
  "2915",
  36,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "B224",
  36,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "G503",
  35,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "G201",
  35,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "A017",
  35,
  "SEETHAMMADHARA"
 ],
 [
  "G506",
  35,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "0126",
  35,
  "PURUSHOTHAPALLI (NIDADAVOLE)"
 ],
 [
  "A806",
  35,
  "MVP (WALTAIR)"
 ],
 [
  "V490",
  35,
  "S.KOTA"
 ],
 [
  "4517",
  35,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "0764",
  35,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "P018",
  35,
  "PM PALEM (MADHURAWADA)"
 ],
 [
  "K022",
  35,
  "KOMMADI (MADHURAWADA)"
 ],
 [
  "0445",
  35,
  "TADERU (PALAKODERU)"
 ],
 [
  "B009",
  35,
  "ANANDAPURAM"
 ],
 [
  "1018",
  35,
  "ALAMURU (KOTHAPETA)"
 ],
 [
  "3311",
  35,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "B127",
  35,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "3334",
  35,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "C609",
  35,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "0587",
  35,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "I115",
  35,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "2911",
  35,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "K035",
  35,
  "KONDAKARLA (ATCHUTHAPURAM)"
 ],
 [
  "0607",
  35,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "4107",
  35,
  "TANGELLAMUDI (DENDULURU)"
 ],
 [
  "V334",
  35,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "1067",
  34,
  "RAMPACHODAVARAM"
 ],
 [
  "A023",
  34,
  "SEETHAMMADHARA"
 ],
 [
  "0623",
  34,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "1403",
  34,
  "ALLIPURAM (OLD CITY)"
 ],
 [
  "2804",
  34,
  "PODURU (PALAKOL)"
 ],
 [
  "0069",
  34,
  "KAVITI (SOMPETA)"
 ],
 [
  "R004",
  34,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "0200",
  34,
  "SALURU"
 ],
 [
  "C322",
  34,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "7012",
  34,
  "ATTILI (TANUKU)"
 ],
 [
  "J081",
  34,
  "AMADALAVALASA"
 ],
 [
  "E004",
  34,
  "ATCHUTHAPURAM"
 ],
 [
  "3045",
  34,
  "BORRAMPALEM (KAMAVARAPUKOTA)"
 ],
 [
  "P008",
  34,
  "PALAKONDA"
 ],
 [
  "8021",
  34,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "7005",
  34,
  "ATTILI (TANUKU)"
 ],
 [
  "2116",
  34,
  "NIDAMARRU (UNGUTURU)"
 ],
 [
  "B002",
  34,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "G323",
  34,
  "RAVIKAMATAM (MADUGULA)"
 ],
 [
  "G520",
  33,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "0013",
  33,
  "MURAMANDA (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "V141",
  33,
  "VEPADA (S.KOTA)"
 ],
 [
  "A207",
  33,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "3116",
  33,
  "YELESWARAM (PRATHIPADU)"
 ],
 [
  "T019",
  33,
  "THATICHETLAPALEM (DONDAPARTHY)"
 ],
 [
  "B606",
  33,
  "MVP (WALTAIR)"
 ],
 [
  "0287",
  33,
  "BUTTAIGUDEM (POLAVARAM)"
 ],
 [
  "0344",
  33,
  "RAJANAGARAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "J009",
  33,
  "SAGARNAGAR (MADHURAWADA)"
 ],
 [
  "0830",
  33,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0447",
  33,
  "TADERU (PALAKODERU)"
 ],
 [
  "0720",
  33,
  "UNDI (AKIVEEDU)"
 ],
 [
  "0522",
  33,
  "THONDANGI (TUNI)"
 ],
 [
  "0914",
  33,
  "PRAKASHAM CHOWK (BHIMAVARAM)"
 ],
 [
  "A304",
  33,
  "PEDAWALTAIR (WALTAIR)"
 ],
 [
  "B104",
  33,
  "PEDAWALTAIR (WALTAIR)"
 ],
 [
  "0467",
  33,
  "TADUVAI (JANGAREDDYGUDEM)"
 ],
 [
  "1250",
  33,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "2333",
  33,
  "DENDULURU"
 ],
 [
  "1258",
  33,
  "GANGAVARAM-VSKP (MALKAPURAM)"
 ],
 [
  "V435",
  33,
  "S.KOTA"
 ],
 [
  "4304",
  33,
  "JAGANNAICKPUR (SARPAVARAM)"
 ],
 [
  "M119",
  33,
  "RAJAM"
 ],
 [
  "5108",
  33,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "0222",
  33,
  "RAGHAVAPURAM (CHINTALAPUDI)"
 ],
 [
  "2134",
  33,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "4022",
  33,
  "RANGAPURAM (PEDAVEGI)"
 ],
 [
  "HB06",
  32,
  "HB COLONY (SEETHAMMADHARA)"
 ],
 [
  "R091",
  32,
  "V T AGRAHARAM (VIZIANAGARAM)"
 ],
 [
  "7219",
  32,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "A020",
  32,
  "SEETHAMMADHARA"
 ],
 [
  "0517",
  32,
  "MAMIDIKUDURU (RAZOLE)"
 ],
 [
  "0300",
  32,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "7510",
  32,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "7514",
  32,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "7507",
  32,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "S002",
  32,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "7303",
  32,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "8011",
  32,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "J149",
  32,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "C006",
  32,
  "BHEEMILI"
 ],
 [
  "0176",
  32,
  "JAGGAMPETA"
 ],
 [
  "0817",
  32,
  "UNDI (AKIVEEDU)"
 ],
 [
  "R089",
  32,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "1030",
  32,
  "NARSAPURAM"
 ],
 [
  "8840",
  32,
  "JNPC-PARAWADA"
 ],
 [
  "2221",
  32,
  "KAJULURU (KARAPA)"
 ],
 [
  "M023",
  32,
  "MADDILAPALEM (SEETHAMMADHARA)"
 ],
 [
  "7007",
  32,
  "ATTILI (TANUKU)"
 ],
 [
  "2281",
  32,
  "PENDURTHI"
 ],
 [
  "2313",
  32,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "V302",
  32,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "0783",
  32,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "2805",
  32,
  "PODURU (PALAKOL)"
 ],
 [
  "V328",
  31,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "D135",
  31,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "D004",
  31,
  "DONDAPARTHY"
 ],
 [
  "5228",
  31,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "7516",
  31,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "2233",
  31,
  "KAJULURU (KARAPA)"
 ],
 [
  "B328",
  31,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "2232",
  31,
  "KAJULURU (KARAPA)"
 ],
 [
  "B108",
  31,
  "SIRIPURAM (WALTAIR)"
 ],
 [
  "0583",
  31,
  "GOPALAPURAM"
 ],
 [
  "6307",
  31,
  "MORAMPUDI"
 ],
 [
  "C112",
  31,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "1117",
  31,
  "KOTTURU RESCO (KOTTURU)"
 ],
 [
  "7515",
  31,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "5006",
  31,
  "PEDDAPURAM (SAMALKOTA)"
 ],
 [
  "3310",
  31,
  "PRATAPNAGAR (SARPAVARAM)"
 ],
 [
  "V301",
  31,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "0566",
  31,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "4804",
  31,
  "TALLAREVU (KARAPA)"
 ],
 [
  "1037",
  31,
  "VIJAYARAI (PEDAVEGI)"
 ],
 [
  "B202",
  31,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "1156",
  31,
  "SRIHARIPURAM (MALKAPURAM)"
 ],
 [
  "A223",
  31,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "5133",
  31,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "C317",
  31,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "P006",
  31,
  "BOBBILI"
 ],
 [
  "K010",
  31,
  "DEVARAPALLI (CHODAVARAM)"
 ],
 [
  "B110",
  31,
  "BHOGAPURAM"
 ],
 [
  "I225",
  31,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "G208",
  30,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "G516",
  30,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "B301",
  30,
  "GUMMALAKSHMIPURAM (KURUPAM ITDA)"
 ],
 [
  "P022",
  30,
  "PM PALEM (MADHURAWADA)"
 ],
 [
  "0015",
  30,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "8415",
  30,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "G117",
  30,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "6304",
  30,
  "SATELLITE CITY (MORAMPUDI)"
 ],
 [
  "D010",
  30,
  "DONDAPARTHY"
 ],
 [
  "4603",
  30,
  "KARAPA"
 ],
 [
  "0905",
  30,
  "ANNAVARAM (TUNI)"
 ],
 [
  "R114",
  30,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "3357",
  30,
  "PEDAPADU (DENDULURU)"
 ],
 [
  "P108",
  30,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "P046",
  30,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "7209",
  30,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "0755",
  30,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "T057",
  30,
  "THATICHETLAPALEM (DONDAPARTHY)"
 ],
 [
  "5111",
  30,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "0637",
  30,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "P007",
  30,
  "K.KOTAPADU (CHODAVARAM)"
 ],
 [
  "D015",
  30,
  "ATCHUTHAPURAM"
 ],
 [
  "0706",
  30,
  "UNDI (AKIVEEDU)"
 ],
 [
  "I213",
  30,
  "RANASTHALAM"
 ],
 [
  "5132",
  30,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "M401",
  30,
  "MELIAPUTTI (PATHAPATNAM)"
 ],
 [
  "0662",
  30,
  "SAKHINETIPALLI (RAZOLE)"
 ],
 [
  "0165",
  30,
  "AMALAPURAM"
 ],
 [
  "0433",
  30,
  "TADERU (PALAKODERU)"
 ],
 [
  "1206",
  30,
  "POOLAPALLI (PALAKOL)"
 ],
 [
  "0428",
  30,
  "TADERU (PALAKODERU)"
 ],
 [
  "G501",
  29,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "G513",
  29,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "R045",
  29,
  "V T AGRAHARAM (VIZIANAGARAM)"
 ],
 [
  "7911",
  29,
  "KONTHAMURU (RAJAMAHENDRAVARAM)"
 ],
 [
  "I226",
  29,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "N060",
  29,
  "NARASANNAPETA"
 ],
 [
  "J107",
  29,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "V492",
  29,
  "S.KOTA"
 ],
 [
  "B806",
  29,
  "MVP (WALTAIR)"
 ],
 [
  "G013",
  29,
  "VENKANNAPALEM (CHODAVARAM)"
 ],
 [
  "4503",
  29,
  "GYGOLAPADU (SARPAVARAM)"
 ],
 [
  "V437",
  29,
  "S.KOTA"
 ],
 [
  "K084",
  29,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "0659",
  29,
  "SAKHINETIPALLI (RAZOLE)"
 ],
 [
  "I155",
  29,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "R003",
  29,
  "BHEEMILI"
 ],
 [
  "0922",
  29,
  "PRAKASHAM CHOWK (BHIMAVARAM)"
 ],
 [
  "V525",
  29,
  "JAMI (S.KOTA)"
 ],
 [
  "0753",
  29,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "1313",
  29,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "7103",
  29,
  "UNGUTURU"
 ],
 [
  "R084",
  29,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "0665",
  29,
  "YERNAGUDEM (GOPALAPURAM)"
 ],
 [
  "6103",
  29,
  "POWERPET (ELURU)"
 ],
 [
  "3025",
  29,
  "BORRAMPALEM (KAMAVARAPUKOTA)"
 ],
 [
  "N055",
  29,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "P510",
  29,
  "PATHAPATNAM"
 ],
 [
  "0268",
  29,
  "VEERAVASARAM (PALAKODERU)"
 ],
 [
  "0424",
  29,
  "SANKHAVARAM (PRATHIPADU)"
 ],
 [
  "B253",
  29,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "5529",
  29,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "0639",
  29,
  "DEVARPALLI (GOPALAPURAM)"
 ],
 [
  "T013",
  29,
  "KONDAKARLA (ATCHUTHAPURAM)"
 ],
 [
  "2128",
  29,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "7136",
  29,
  "UNGUTURU"
 ],
 [
  "G402",
  29,
  "NELLIMARLA"
 ],
 [
  "R125",
  29,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "3203",
  29,
  "SITARAMAPURAM (NARSAPURAM)"
 ],
 [
  "2106",
  29,
  "RAMACHANDRAPURAM"
 ],
 [
  "0813",
  28,
  "PRATHIPADU"
 ],
 [
  "3309",
  28,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "HB07",
  28,
  "HB COLONY (SEETHAMMADHARA)"
 ],
 [
  "0198",
  28,
  "JAGGAMPETA"
 ],
 [
  "7910",
  28,
  "KONTHAMURU (RAJAMAHENDRAVARAM)"
 ],
 [
  "N024",
  28,
  "NARASANNAPETA"
 ],
 [
  "S207",
  28,
  "BALIJIPETA (PARVATHIPURAM)"
 ],
 [
  "00T2",
  28,
  "CHINAGANTYADA (GAJUWAKA)"
 ],
 [
  "P017",
  28,
  "PM PALEM (MADHURAWADA)"
 ],
 [
  "2273",
  28,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "C007",
  28,
  "THATITURU (BHEEMILI)"
 ],
 [
  "3821",
  28,
  "MURALINAGAR (KANCHARAPALEM)"
 ],
 [
  "N053",
  28,
  "SANTAKAVITI (RAJAM)"
 ],
 [
  "B306",
  28,
  "MVP (WALTAIR)"
 ],
 [
  "00VS",
  28,
  "AUTONAGAR"
 ],
 [
  "2206",
  28,
  "KAJULURU (KARAPA)"
 ],
 [
  "S628",
  28,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "0007",
  28,
  "MURAMANDA (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "B177",
  28,
  "BHOGAPURAM"
 ],
 [
  "0513",
  28,
  "THONDANGI (TUNI)"
 ],
 [
  "N004",
  28,
  "CHITTIVALASA (BHEEMILI)"
 ],
 [
  "C004",
  28,
  "CHITTIVALASA (BHEEMILI)"
 ],
 [
  "A308",
  28,
  "SIRIPURAM (WALTAIR)"
 ],
 [
  "2917",
  28,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "7771",
  28,
  "AGANAMPUDI"
 ],
 [
  "0471",
  28,
  "TADERU (PALAKODERU)"
 ],
 [
  "4905",
  28,
  "SAMALKOTA"
 ],
 [
  "0865",
  28,
  "KANCHILI (SOMPETA)"
 ],
 [
  "6115",
  28,
  "BHAGYALAKSHMIPETA (TADEPALLIGUDEM)"
 ],
 [
  "I306",
  28,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "0021",
  28,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "7223",
  28,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "3815",
  28,
  "MURALINAGAR (KANCHARAPALEM)"
 ],
 [
  "J118",
  28,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "3304",
  28,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "8849",
  28,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "1103",
  28,
  "KASIMKOTA"
 ],
 [
  "2703",
  28,
  "ACHANTA"
 ],
 [
  "1460",
  28,
  "KANCHARAPALEM"
 ],
 [
  "3315",
  27,
  "SABBAVARAM-D2 (SABBAVARAM)"
 ],
 [
  "8848",
  27,
  "JNPC-PARAWADA"
 ],
 [
  "R006",
  27,
  "ATCHUTHAPURAM"
 ],
 [
  "0335",
  27,
  "TADIKALAPUDI (KAMAVARAPUKOTA)"
 ],
 [
  "0019",
  27,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "D210",
  27,
  "DONDAPARTHY"
 ],
 [
  "MM01",
  27,
  "MERAKAMUDIDAM (CHIPURUPALLI)"
 ],
 [
  "I424",
  27,
  "ETCHERLA"
 ],
 [
  "2914",
  27,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "2732",
  27,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "N020",
  27,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "4506",
  27,
  "GYGOLAPADU (SARPAVARAM)"
 ],
 [
  "0955",
  27,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "I910",
  27,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "5234",
  27,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "6618",
  27,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "0183",
  27,
  "CHAGALLU (KOVVURU)"
 ],
 [
  "I552",
  27,
  "P.N.COLONY (SRIKAKULAM)"
 ],
 [
  "L003",
  27,
  "ANANDAPURAM"
 ],
 [
  "T002",
  27,
  "CHITTIVALASA (BHEEMILI)"
 ],
 [
  "0347",
  27,
  "RAJANAGARAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "1026",
  27,
  "NARSAPURAM"
 ],
 [
  "I940",
  27,
  "NARSIPATNAM"
 ],
 [
  "5017",
  27,
  "PERAVALI (NIDADAVOLE)"
 ],
 [
  "K016",
  27,
  "BHEEMILI"
 ],
 [
  "H808",
  27,
  "NATHAVARAM"
 ],
 [
  "6628",
  27,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "P009",
  27,
  "PALAKONDA"
 ],
 [
  "0520",
  27,
  "GUMMALURU (AKIVEEDU)"
 ],
 [
  "2803",
  27,
  "PODURU (PALAKOL)"
 ],
 [
  "N025",
  27,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "0255",
  27,
  "I.POLAVARAM (MUMMIDIVARAM)"
 ],
 [
  "S306",
  27,
  "RAMBADRAPURAM (BADANGI)"
 ],
 [
  "CH19",
  27,
  "CHIPURUPALLI"
 ],
 [
  "G519",
  26,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "G511",
  26,
  "PAYAKARAOPETA (PAYAKARAO PETA)"
 ],
 [
  "0805",
  26,
  "INDUSTRIAL ESTATE (BHIMAVARAM)"
 ],
 [
  "2222",
  26,
  "KAJULURU (KARAPA)"
 ],
 [
  "0GSC",
  26,
  "GAJUWAKA"
 ],
 [
  "6020",
  26,
  "DWARAKA TIRUMALA (BHIMADOLU)"
 ],
 [
  "5009",
  26,
  "PERAVALI (NIDADAVOLE)"
 ],
 [
  "4823",
  26,
  "TALLAREVU (KARAPA)"
 ],
 [
  "1203",
  26,
  "POOLAPALLI (PALAKOL)"
 ],
 [
  "0625",
  26,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "3353",
  26,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "3838",
  26,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "K024",
  26,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "0177",
  26,
  "JAGGAMPETA"
 ],
 [
  "A019",
  26,
  "SEETHAMMADHARA"
 ],
 [
  "S004",
  26,
  "K.KOTAPADU (CHODAVARAM)"
 ],
 [
  "4034",
  26,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "G703",
  26,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "0765",
  26,
  "KOTANANDURU (TUNI)"
 ],
 [
  "0293",
  26,
  "KOTHAPETA"
 ],
 [
  "7304",
  26,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "5233",
  26,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "0760",
  26,
  "KOTANANDURU (TUNI)"
 ],
 [
  "B214",
  26,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "H812",
  26,
  "NATHAVARAM"
 ],
 [
  "7137",
  26,
  "GOLLAGUDEM (UNGUTURU)"
 ],
 [
  "5505",
  26,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "2319",
  26,
  "DENDULURU"
 ],
 [
  "A040",
  26,
  "SEETHAMMADHARA"
 ],
 [
  "B201",
  26,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "1028",
  26,
  "PALAKOLE (PALAKOL)"
 ],
 [
  "R112",
  26,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "K094",
  26,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "M020",
  26,
  "MADDILAPALEM (SEETHAMMADHARA)"
 ],
 [
  "5211",
  26,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "1284",
  26,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "V107",
  26,
  "VEPADA (S.KOTA)"
 ],
 [
  "3211",
  26,
  "RAJAVOMMANGI (RAMPACHODAVARAM RURAL)"
 ],
 [
  "I222",
  26,
  "RANASTHALAM"
 ],
 [
  "G320",
  26,
  "GURLA (NELLIMARLA)"
 ],
 [
  "0253",
  26,
  "I.POLAVARAM (MUMMIDIVARAM)"
 ],
 [
  "G404",
  26,
  "NELLIMARLA"
 ],
 [
  "9228",
  26,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "G523",
  25,
  "PAYAKARAOPETA (PAYAKARAO PETA)"
 ],
 [
  "7504",
  25,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "G507",
  25,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "4306",
  25,
  "JAGANNAICKPUR (SARPAVARAM)"
 ],
 [
  "G125",
  25,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "4806",
  25,
  "TALLAREVU (KARAPA)"
 ],
 [
  "2718",
  25,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "0256",
  25,
  "I.POLAVARAM (MUMMIDIVARAM)"
 ],
 [
  "4629",
  25,
  "KARAPA"
 ],
 [
  "Y009",
  25,
  "ELAMANCHILI"
 ],
 [
  "3039",
  25,
  "T-NARSAPURAM (KAMAVARAPUKOTA)"
 ],
 [
  "I906",
  25,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "7317",
  25,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "0768",
  25,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "3328",
  25,
  "INDRAPALEM (SARPAVARAM)"
 ],
 [
  "2604",
  25,
  "DWARAPUDI (MANDAPETA)"
 ],
 [
  "M002",
  25,
  "MADUGULA"
 ],
 [
  "0507",
  25,
  "THONDANGI (TUNI)"
 ],
 [
  "7312",
  25,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "P219",
  25,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "4311",
  25,
  "JAGANNAICKPUR (SARPAVARAM)"
 ],
 [
  "B220",
  25,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "4902",
  25,
  "SAMALKOTA"
 ],
 [
  "2131",
  25,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "B276",
  25,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "V001",
  25,
  "CHEEDIKADA (MADUGULA)"
 ],
 [
  "C309",
  25,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "4904",
  25,
  "SAMALKOTA"
 ],
 [
  "D016",
  25,
  "DONDAPARTHY"
 ],
 [
  "A218",
  25,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "0850",
  25,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "1303",
  25,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "7506",
  25,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "V329",
  25,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "1268",
  25,
  "GANGAVARAM-VSKP (MALKAPURAM)"
 ],
 [
  "1027",
  25,
  "TANUKU"
 ],
 [
  "V012",
  25,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "V053",
  25,
  "VSLNAGAR (MADHURAWADA)"
 ],
 [
  "4006",
  25,
  "RAMARAOPETA (KAKINADA)"
 ],
 [
  "B017",
  25,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "V005",
  25,
  "K.KOTAPADU (CHODAVARAM)"
 ],
 [
  "B353",
  25,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "S422",
  25,
  "MAKKUVA (SALURU)"
 ],
 [
  "P020",
  25,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "5003",
  25,
  "PERAVALI (NIDADAVOLE)"
 ],
 [
  "2919",
  25,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "S263",
  25,
  "GARA (SRIKAKULAM)"
 ],
 [
  "4204",
  25,
  "MOGALTURU (NARSAPURAM)"
 ],
 [
  "I505",
  25,
  "ETCHERLA"
 ],
 [
  "0167",
  25,
  "RANGAMPETA (ANAPARTHY)"
 ],
 [
  "1713",
  25,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "0466",
  25,
  "TADUVAI (JANGAREDDYGUDEM)"
 ],
 [
  "I516",
  25,
  "ETCHERLA"
 ],
 [
  "V412",
  25,
  "S.KOTA"
 ],
 [
  "P225",
  25,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "G120",
  25,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "3356",
  25,
  "SABBAVARAM-D2 (SABBAVARAM)"
 ],
 [
  "9231",
  25,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "A408",
  24,
  "SIRIPURAM (WALTAIR)"
 ],
 [
  "G508",
  24,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "M021",
  24,
  "MADDILAPALEM (SEETHAMMADHARA)"
 ],
 [
  "3207",
  24,
  "SITARAMAPURAM (NARSAPURAM)"
 ],
 [
  "1752",
  24,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "4519",
  24,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "B608",
  24,
  "SIRIPURAM (WALTAIR)"
 ],
 [
  "B285",
  24,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "2603",
  24,
  "DWARAPUDI (MANDAPETA)"
 ],
 [
  "1152",
  24,
  "SRIHARIPURAM (MALKAPURAM)"
 ],
 [
  "0185",
  24,
  "JAGGAMPETA"
 ],
 [
  "0808",
  24,
  "PRATHIPADU"
 ],
 [
  "I551",
  24,
  "P.N.COLONY (SRIKAKULAM)"
 ],
 [
  "0751",
  24,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "4802",
  24,
  "TALLAREVU (KARAPA)"
 ],
 [
  "0193",
  24,
  "JAGGAMPETA"
 ],
 [
  "R122",
  24,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "P221",
  24,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "7127",
  24,
  "UNGUTURU"
 ],
 [
  "R105",
  24,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "J401",
  24,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "7104",
  24,
  "UNGUTURU"
 ],
 [
  "I914",
  24,
  "NARSIPATNAM"
 ],
 [
  "6119",
  24,
  "BHAGYALAKSHMIPETA (TADEPALLIGUDEM)"
 ],
 [
  "0263",
  24,
  "I.POLAVARAM (MUMMIDIVARAM)"
 ],
 [
  "0291",
  24,
  "KOTHAPETA"
 ],
 [
  "B208",
  24,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "5128",
  24,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "2127",
  24,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "5112",
  24,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "8414",
  24,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "2515",
  24,
  "MANDAPETA"
 ],
 [
  "B226",
  24,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "B204",
  24,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "0669",
  24,
  "SAKHINETIPALLI (RAZOLE)"
 ],
 [
  "0816",
  24,
  "BAYYANNAGUDEM (POLAVARAM)"
 ],
 [
  "P051",
  24,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "0269",
  24,
  "BUTTAIGUDEM (POLAVARAM)"
 ],
 [
  "B003",
  24,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "1406",
  24,
  "KANCHARAPALEM"
 ],
 [
  "3808",
  24,
  "MURALINAGAR (KANCHARAPALEM)"
 ],
 [
  "E006",
  23,
  "ELAMANCHILI"
 ],
 [
  "P036",
  23,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "G510",
  23,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "0526",
  23,
  "ANNAVARAM (TUNI)"
 ],
 [
  "0570",
  23,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "7205",
  23,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "S077",
  23,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "4309",
  23,
  "JAGANNAICKPUR (SARPAVARAM)"
 ],
 [
  "7220",
  23,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "7709",
  23,
  "AGANAMPUDI"
 ],
 [
  "0621",
  23,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "A100",
  23,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "0539",
  23,
  "GUMMALURU (AKIVEEDU)"
 ],
 [
  "2110",
  23,
  "R R PETA (ELURU)"
 ],
 [
  "1462",
  23,
  "MALKIPURAM (RAZOLE)"
 ],
 [
  "A222",
  23,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "K032",
  23,
  "ELAMANCHILI"
 ],
 [
  "0275",
  23,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "0140",
  23,
  "NIDADAVOLE"
 ],
 [
  "2725",
  23,
  "ACHANTA"
 ],
 [
  "J334",
  23,
  "PONDURU (ETCHERLA)"
 ],
 [
  "2514",
  23,
  "MANDAPETA"
 ],
 [
  "K004",
  23,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "P023",
  23,
  "PM PALEM (MADHURAWADA)"
 ],
 [
  "0018",
  23,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "2236",
  23,
  "KAJULURU (KARAPA)"
 ],
 [
  "0332",
  23,
  "TADIKALAPUDI (KAMAVARAPUKOTA)"
 ],
 [
  "N303",
  23,
  "NARASANNAPETA"
 ],
 [
  "6006",
  23,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "A284",
  23,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "C605",
  23,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "0134",
  23,
  "NIDADAVOLE"
 ],
 [
  "V363",
  23,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "0152",
  23,
  "AMALAPURAM"
 ],
 [
  "C131",
  23,
  "DATTI RAJERU (GAJAPATHINAGARAM)"
 ],
 [
  "3336",
  23,
  "SABBAVARAM-D2 (SABBAVARAM)"
 ],
 [
  "6632",
  23,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "G326",
  23,
  "GURLA (NELLIMARLA)"
 ],
 [
  "6010",
  23,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "M007",
  23,
  "RAJAM"
 ],
 [
  "V496",
  23,
  "S.KOTA"
 ],
 [
  "A026",
  23,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "S324",
  23,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "R015",
  23,
  "V T AGRAHARAM (VIZIANAGARAM)"
 ],
 [
  "T012",
  22,
  "ELAMANCHILI"
 ],
 [
  "1202",
  22,
  "AKKAYYAPALEM (DONDAPARTHY)"
 ],
 [
  "G231",
  22,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "4610",
  22,
  "KARAPA"
 ],
 [
  "5227",
  22,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "R021",
  22,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "A035",
  22,
  "SEETHAMMADHARA"
 ],
 [
  "T015",
  22,
  "THATICHETLAPALEM (DONDAPARTHY)"
 ],
 [
  "0220",
  22,
  "MUMMIDIVARAM"
 ],
 [
  "HB05",
  22,
  "HB COLONY (SEETHAMMADHARA)"
 ],
 [
  "5103",
  22,
  "R R PETA (ELURU)"
 ],
 [
  "0400",
  22,
  "V T AGRAHARAM (VIZIANAGARAM)"
 ],
 [
  "4619",
  22,
  "KARAPA"
 ],
 [
  "M006",
  22,
  "ANANDAPURAM"
 ],
 [
  "0389",
  22,
  "MANDASA (PALASA)"
 ],
 [
  "3009",
  22,
  "TETALI (TANUKU)"
 ],
 [
  "0654",
  22,
  "PEDAPUDI (KARAPA)"
 ],
 [
  "S301",
  22,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "N008",
  22,
  "ANANDAPURAM"
 ],
 [
  "1208",
  22,
  "POOLAPALLI (PALAKOL)"
 ],
 [
  "M017",
  22,
  "KOMMADI (MADHURAWADA)"
 ],
 [
  "1277",
  22,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "1351",
  22,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "C310",
  22,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "2329",
  22,
  "DENDULURU"
 ],
 [
  "T001",
  22,
  "THATITURU (BHEEMILI)"
 ],
 [
  "S003",
  22,
  "ANANDAPURAM"
 ],
 [
  "T323",
  22,
  "TEKKALI"
 ],
 [
  "M112",
  22,
  "RAJAM"
 ],
 [
  "4302",
  22,
  "JAGANNAICKPUR (SARPAVARAM)"
 ],
 [
  "J326",
  22,
  "PONDURU (ETCHERLA)"
 ],
 [
  "0260",
  22,
  "I.POLAVARAM (MUMMIDIVARAM)"
 ],
 [
  "A208",
  22,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "D151",
  22,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "K713",
  22,
  "KOTABOMMALI"
 ],
 [
  "M133",
  22,
  "RAJAM"
 ],
 [
  "C325",
  22,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "A010",
  22,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "P066",
  22,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "K047",
  22,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "V502",
  22,
  "JAMI (S.KOTA)"
 ],
 [
  "B329",
  22,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "8009",
  22,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "H824",
  22,
  "NATHAVARAM"
 ],
 [
  "S205",
  22,
  "BADANGI"
 ],
 [
  "S342",
  22,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "0365",
  22,
  "JEELUGUMILLI"
 ],
 [
  "0551",
  22,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "K725",
  21,
  "KOTABOMMALI"
 ],
 [
  "C335",
  21,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "J098",
  21,
  "AMADALAVALASA"
 ],
 [
  "C102",
  21,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "0186",
  21,
  "CHAGALLU (KOVVURU)"
 ],
 [
  "J306",
  21,
  "PONDURU (ETCHERLA)"
 ],
 [
  "3835",
  21,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "S082",
  21,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "G233",
  21,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "A257",
  21,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "N007",
  21,
  "BHEEMILI"
 ],
 [
  "P213",
  21,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "0429",
  21,
  "TADERU (PALAKODERU)"
 ],
 [
  "I432",
  21,
  "ETCHERLA"
 ],
 [
  "A404",
  21,
  "PEDAWALTAIR (WALTAIR)"
 ],
 [
  "0168",
  21,
  "RANGAMPETA (ANAPARTHY)"
 ],
 [
  "0338",
  21,
  "TADIKALAPUDI (KAMAVARAPUKOTA)"
 ],
 [
  "V354",
  21,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "6018",
  21,
  "DWARAKA TIRUMALA (BHIMADOLU)"
 ],
 [
  "5012",
  21,
  "PERAVALI (NIDADAVOLE)"
 ],
 [
  "I923",
  21,
  "NARSIPATNAM"
 ],
 [
  "E001",
  21,
  "PALASA"
 ],
 [
  "V007",
  21,
  "DEVARAPALLI (CHODAVARAM)"
 ],
 [
  "J137",
  21,
  "SARUBUJJILI (AMADALAVALASA)"
 ],
 [
  "R051",
  21,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "7014",
  21,
  "M NAGULAPALLI (BHIMADOLU)"
 ],
 [
  "T317",
  21,
  "TEKKALI"
 ],
 [
  "G529",
  21,
  "NELLIMARLA"
 ],
 [
  "3330",
  21,
  "INDRAPALEM (SARPAVARAM)"
 ],
 [
  "0887",
  21,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "2517",
  21,
  "MANDAPETA"
 ],
 [
  "C302",
  21,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "H834",
  21,
  "NATHAVARAM"
 ],
 [
  "A021",
  21,
  "SEETHAMMADHARA"
 ],
 [
  "GV35",
  21,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "7006",
  21,
  "ATTILI (TANUKU)"
 ],
 [
  "5226",
  21,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "C134",
  21,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "A028",
  21,
  "ARILOVA (GOPALAPATNAM)"
 ],
 [
  "S221",
  21,
  "GARA (SRIKAKULAM)"
 ],
 [
  "A011",
  21,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "S311",
  21,
  "RAMBADRAPURAM (BADANGI)"
 ],
 [
  "B281",
  21,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "6012",
  21,
  "DWARAKA TIRUMALA (BHIMADOLU)"
 ],
 [
  "P014",
  21,
  "ANANDAPURAM"
 ],
 [
  "4310",
  21,
  "JAGANNAICKPUR (SARPAVARAM)"
 ],
 [
  "8407",
  21,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "G522",
  20,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "1207",
  20,
  "AKKAYYAPALEM (DONDAPARTHY)"
 ],
 [
  "B184",
  20,
  "BHOGAPURAM"
 ],
 [
  "0724",
  20,
  "UNDI (AKIVEEDU)"
 ],
 [
  "C308",
  20,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "2025",
  20,
  "BHIMADOLU"
 ],
 [
  "1278",
  20,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "3319",
  20,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "7016",
  20,
  "ATTILI (TANUKU)"
 ],
 [
  "0910",
  20,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "2163",
  20,
  "SIMHACHALAM (GOPALAPATNAM)"
 ],
 [
  "3804",
  20,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "3802",
  20,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "1155",
  20,
  "MALKAPURAM"
 ],
 [
  "7113",
  20,
  "UNGUTURU"
 ],
 [
  "1283",
  20,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "3810",
  20,
  "MURALINAGAR (KANCHARAPALEM)"
 ],
 [
  "7111",
  20,
  "GOLLAGUDEM (UNGUTURU)"
 ],
 [
  "2259",
  20,
  "PENDURTHI"
 ],
 [
  "V003",
  20,
  "MADUGULA"
 ],
 [
  "A022",
  20,
  "SEETHAMMADHARA"
 ],
 [
  "G108",
  20,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "0415",
  20,
  "SANKHAVARAM (PRATHIPADU)"
 ],
 [
  "T009",
  20,
  "CHITTIVALASA (BHEEMILI)"
 ],
 [
  "2711",
  20,
  "ACHANTA"
 ],
 [
  "G544",
  20,
  "NELLIMARLA"
 ],
 [
  "2045",
  20,
  "BHIMADOLU"
 ],
 [
  "2178",
  20,
  "SIMHACHALAM (GOPALAPATNAM)"
 ],
 [
  "4024",
  20,
  "RANGAPURAM (PEDAVEGI)"
 ],
 [
  "C141",
  20,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "N039",
  20,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "2519",
  20,
  "MANDAPETA"
 ],
 [
  "6124",
  20,
  "BHAGYALAKSHMIPETA (TADEPALLIGUDEM)"
 ],
 [
  "4308",
  20,
  "JAGANNAICKPUR (SARPAVARAM)"
 ],
 [
  "0163",
  20,
  "AMALAPURAM"
 ],
 [
  "3349",
  20,
  "SABBAVARAM-D2 (SABBAVARAM)"
 ],
 [
  "A034",
  20,
  "SEETHAMMADHARA"
 ],
 [
  "P056",
  20,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "2112",
  20,
  "NIDAMARRU (UNGUTURU)"
 ],
 [
  "0318",
  20,
  "AMBAJIPETA (AMALAPURAM)"
 ],
 [
  "G002",
  20,
  "CHEEDIKADA (MADUGULA)"
 ],
 [
  "K006",
  20,
  "ANANDAPURAM"
 ],
 [
  "K009",
  20,
  "CHEEDIKADA (MADUGULA)"
 ],
 [
  "G124",
  20,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "7008",
  20,
  "ATTILI (TANUKU)"
 ],
 [
  "B178",
  20,
  "BHOGAPURAM"
 ],
 [
  "2607",
  20,
  "DWARAPUDI (MANDAPETA)"
 ],
 [
  "V027",
  19,
  "VSLNAGAR (MADHURAWADA)"
 ],
 [
  "J222",
  19,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "P043",
  19,
  "ELAMANCHILI"
 ],
 [
  "4512",
  19,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "5008",
  19,
  "PEDDAPURAM (SAMALKOTA)"
 ],
 [
  "G524",
  19,
  "PAYAKARAOPETA (PAYAKARAO PETA)"
 ],
 [
  "S211",
  19,
  "BALIJIPETA (PARVATHIPURAM)"
 ],
 [
  "7323",
  19,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "00F1",
  19,
  "VADLAPUDI (AUTONAGAR)"
 ],
 [
  "D017",
  19,
  "ANAKAPALLI (ANAKAPALLE)"
 ],
 [
  "2229",
  19,
  "MUNAGAPAKA (KOTTURU)"
 ],
 [
  "V507",
  19,
  "JAMI (S.KOTA)"
 ],
 [
  "0761",
  19,
  "KOTANANDURU (TUNI)"
 ],
 [
  "0244",
  19,
  "PALAKODERU"
 ],
 [
  "2301",
  19,
  "DENDULURU"
 ],
 [
  "N001",
  19,
  "NARASANNAPETA"
 ],
 [
  "0836",
  19,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "4117",
  19,
  "MOGALTURU (NARSAPURAM)"
 ],
 [
  "4608",
  19,
  "KARAPA"
 ],
 [
  "I224",
  19,
  "RANASTHALAM"
 ],
 [
  "0041",
  19,
  "KANCHILI (SOMPETA)"
 ],
 [
  "H827",
  19,
  "NATHAVARAM"
 ],
 [
  "4906",
  19,
  "SAMALKOTA"
 ],
 [
  "7907",
  19,
  "KONTHAMURU (RAJAMAHENDRAVARAM)"
 ],
 [
  "P029",
  19,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "R010",
  19,
  "MADHURAWADA"
 ],
 [
  "2033",
  19,
  "BHIMADOLU"
 ],
 [
  "0379",
  19,
  "JEELUGUMILLI"
 ],
 [
  "2719",
  19,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "1024",
  19,
  "TANUKU"
 ],
 [
  "0361",
  19,
  "JEELUGUMILLI"
 ],
 [
  "7125",
  19,
  "GOLLAGUDEM (UNGUTURU)"
 ],
 [
  "J444",
  19,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "4018",
  19,
  "LINGAPALEM (PEDAVEGI)"
 ],
 [
  "2707",
  19,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "1401",
  19,
  "KANCHARAPALEM"
 ],
 [
  "G328",
  19,
  "GURLA (NELLIMARLA)"
 ],
 [
  "5104",
  19,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "D131",
  19,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "B233",
  19,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "2512",
  19,
  "MANDAPETA"
 ],
 [
  "B031",
  19,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "3117",
  19,
  "YELESWARAM (PRATHIPADU)"
 ],
 [
  "0704",
  19,
  "UNDI (AKIVEEDU)"
 ],
 [
  "2266",
  19,
  "PENDURTHI"
 ],
 [
  "B207",
  19,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "H815",
  19,
  "NATHAVARAM"
 ],
 [
  "1124",
  19,
  "GANAPAVARAM (PEDATADEPALLI)"
 ],
 [
  "3313",
  19,
  "PRATAPNAGAR (SARPAVARAM)"
 ],
 [
  "0383",
  19,
  "KASIBUGGA (PALASA)"
 ],
 [
  "N010",
  19,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "4118",
  19,
  "MOGALTURU (NARSAPURAM)"
 ],
 [
  "J095",
  19,
  "AMADALAVALASA"
 ],
 [
  "I404",
  19,
  "ETCHERLA"
 ],
 [
  "4205",
  19,
  "MOGALTURU (NARSAPURAM)"
 ],
 [
  "D152",
  18,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "1466",
  18,
  "KANCHARAPALEM"
 ],
 [
  "S209",
  18,
  "GARA (SRIKAKULAM)"
 ],
 [
  "0818",
  18,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "CH13",
  18,
  "CHIPURUPALLI"
 ],
 [
  "D188",
  18,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "D001",
  18,
  "THATITURU (BHEEMILI)"
 ],
 [
  "D021",
  18,
  "DONDAPARTHY"
 ],
 [
  "0010",
  18,
  "MURAMANDA (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "R081",
  18,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "2909",
  18,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "2314",
  18,
  "DENDULURU"
 ],
 [
  "7301",
  18,
  "PRAKASHAM CHOWK (BHIMAVARAM)"
 ],
 [
  "4627",
  18,
  "KARAPA"
 ],
 [
  "I247",
  18,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "B179",
  18,
  "BHOGAPURAM"
 ],
 [
  "4305",
  18,
  "JAGANNAICKPUR (SARPAVARAM)"
 ],
 [
  "7309",
  18,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "S213",
  18,
  "GARA (SRIKAKULAM)"
 ],
 [
  "I232",
  18,
  "RANASTHALAM"
 ],
 [
  "P509",
  18,
  "PATHAPATNAM"
 ],
 [
  "0452",
  18,
  "TADUVAI (JANGAREDDYGUDEM)"
 ],
 [
  "A506",
  18,
  "MVP (WALTAIR)"
 ],
 [
  "N063",
  18,
  "SANTAKAVITI (RAJAM)"
 ],
 [
  "5014",
  18,
  "PERAVALI (NIDADAVOLE)"
 ],
 [
  "J112",
  18,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "T383",
  18,
  "TEKKALI"
 ],
 [
  "S214",
  18,
  "BADANGI"
 ],
 [
  "6005",
  18,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "2117",
  18,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "0904",
  18,
  "ASR NAGAR (BHIMAVARAM)"
 ],
 [
  "4630",
  18,
  "KARAPA"
 ],
 [
  "0135",
  18,
  "NIDADAVOLE"
 ],
 [
  "6008",
  18,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "5502",
  18,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "2002",
  18,
  "NGOS COLONY (TANUKU)"
 ],
 [
  "V499",
  18,
  "S.KOTA"
 ],
 [
  "0422",
  18,
  "INAVALLI (AMALAPURAM)"
 ],
 [
  "G324",
  18,
  "RAVIKAMATAM (MADUGULA)"
 ],
 [
  "5135",
  18,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "0129",
  18,
  "KALLA (AKIVEEDU)"
 ],
 [
  "0599",
  18,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "K039",
  18,
  "ATCHUTHAPURAM"
 ],
 [
  "6017",
  18,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "C017",
  18,
  "ATCHUTHAPURAM"
 ],
 [
  "M042",
  18,
  "MADDILAPALEM (SEETHAMMADHARA)"
 ],
 [
  "B404",
  18,
  "PEDAWALTAIR (WALTAIR)"
 ],
 [
  "I114",
  18,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "K015",
  18,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "N032",
  18,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "B376",
  18,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "0916",
  18,
  "PRAKASHAM CHOWK (BHIMAVARAM)"
 ],
 [
  "4907",
  18,
  "SAMALKOTA"
 ],
 [
  "D005",
  18,
  "DONDAPARTHY"
 ],
 [
  "1753",
  18,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "A044",
  18,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "2175",
  18,
  "SIMHACHALAM (GOPALAPATNAM)"
 ],
 [
  "5533",
  18,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "B004",
  18,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "0892",
  18,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "V327",
  18,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "I509",
  18,
  "ETCHERLA"
 ],
 [
  "T058",
  18,
  "THATICHETLAPALEM (DONDAPARTHY)"
 ],
 [
  "S217",
  18,
  "BALIJIPETA (PARVATHIPURAM)"
 ],
 [
  "5541",
  18,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "C133",
  18,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "J134",
  18,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "G321",
  18,
  "GURLA (NELLIMARLA)"
 ],
 [
  "2321",
  18,
  "DENDULURU"
 ],
 [
  "3806",
  18,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "P101",
  18,
  "PALAKONDA"
 ],
 [
  "3314",
  17,
  "PEDAPADU (DENDULURU)"
 ],
 [
  "7217",
  17,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "1701",
  17,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "R110",
  17,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "4803",
  17,
  "TALLAREVU (KARAPA)"
 ],
 [
  "4061",
  17,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "5015",
  17,
  "PERAVALI (NIDADAVOLE)"
 ],
 [
  "T007",
  17,
  "BHEEMILI"
 ],
 [
  "V494",
  17,
  "S.KOTA"
 ],
 [
  "A606",
  17,
  "MVP (WALTAIR)"
 ],
 [
  "B206",
  17,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "K027",
  17,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "M019",
  17,
  "SAGARNAGAR (MADHURAWADA)"
 ],
 [
  "K023",
  17,
  "ANANDAPURAM"
 ],
 [
  "7128",
  17,
  "UNGUTURU"
 ],
 [
  "4816",
  17,
  "TALLAREVU (KARAPA)"
 ],
 [
  "2712",
  17,
  "ACHANTA"
 ],
 [
  "0340",
  17,
  "KAMAVARAPUKOTA"
 ],
 [
  "K074",
  17,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "J225",
  17,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "6635",
  17,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "4616",
  17,
  "KARAPA"
 ],
 [
  "A203",
  17,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "1323",
  17,
  "VIDYUTHSAKHA (OLD CITY)"
 ],
 [
  "P223",
  17,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "J332",
  17,
  "PONDURU (ETCHERLA)"
 ],
 [
  "S024",
  17,
  "ELAMANCHILI"
 ],
 [
  "3002",
  17,
  "TETALI (TANUKU)"
 ],
 [
  "1461",
  17,
  "KANCHARAPALEM"
 ],
 [
  "I367",
  17,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "K042",
  17,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "G416",
  17,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "0028",
  17,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "C313",
  17,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "0016",
  17,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "1275",
  17,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "1263",
  17,
  "GANGAVARAM-VSKP (MALKAPURAM)"
 ],
 [
  "0014",
  17,
  "KADIAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "V493",
  17,
  "S.KOTA"
 ],
 [
  "I908",
  17,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "3011",
  17,
  "TETALI (TANUKU)"
 ],
 [
  "K011",
  17,
  "CHODAVARAM"
 ],
 [
  "C320",
  17,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "V006",
  17,
  "MADUGULA"
 ],
 [
  "V201",
  17,
  "L.KOTA (S.KOTA)"
 ],
 [
  "0243",
  17,
  "NEELADRIPURAM (PEDATADEPALLI)"
 ],
 [
  "5524",
  17,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "I936",
  17,
  "NARSIPATNAM"
 ],
 [
  "B023",
  17,
  "ATCHUTHAPURAM"
 ],
 [
  "6009",
  17,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "I106",
  17,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "G403",
  17,
  "NELLIMARLA"
 ],
 [
  "I514",
  17,
  "ETCHERLA"
 ],
 [
  "J002",
  17,
  "CHEEDIKADA (MADUGULA)"
 ],
 [
  "0715",
  17,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "I342",
  17,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "I515",
  17,
  "ETCHERLA"
 ],
 [
  "2912",
  17,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "6028",
  17,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "K037",
  17,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "P010",
  17,
  "MADUGULA"
 ],
 [
  "V316",
  17,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "0643",
  17,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "G707",
  17,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "M043",
  17,
  "MADDILAPALEM (SEETHAMMADHARA)"
 ],
 [
  "2308",
  17,
  "DENDULURU"
 ],
 [
  "P227",
  17,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "G426",
  17,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "Y010",
  17,
  "KONDAKARLA (ATCHUTHAPURAM)"
 ],
 [
  "0419",
  17,
  "INAVALLI (AMALAPURAM)"
 ],
 [
  "I504",
  17,
  "ETCHERLA"
 ],
 [
  "K774",
  17,
  "KOTABOMMALI"
 ],
 [
  "I203",
  16,
  "RANASTHALAM"
 ],
 [
  "0425",
  16,
  "SANKHAVARAM (PRATHIPADU)"
 ],
 [
  "4527",
  16,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "G521",
  16,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "2802",
  16,
  "PODURU (PALAKOL)"
 ],
 [
  "3819",
  16,
  "MURALINAGAR (KANCHARAPALEM)"
 ],
 [
  "P012",
  16,
  "BOBBILI"
 ],
 [
  "6019",
  16,
  "DWARAKA TIRUMALA (BHIMADOLU)"
 ],
 [
  "H805",
  16,
  "NATHAVARAM"
 ],
 [
  "2724",
  16,
  "ACHANTA"
 ],
 [
  "0834",
  16,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "C326",
  16,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "J136",
  16,
  "SARUBUJJILI (AMADALAVALASA)"
 ],
 [
  "B180",
  16,
  "BHOGAPURAM"
 ],
 [
  "G413",
  16,
  "NELLIMARLA"
 ],
 [
  "3125",
  16,
  "SITARAMAPURAM (NARSAPURAM)"
 ],
 [
  "3317",
  16,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "1302",
  16,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "A013",
  16,
  "ARAKU"
 ],
 [
  "I556",
  16,
  "P.N.COLONY (SRIKAKULAM)"
 ],
 [
  "1766",
  16,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "0023",
  16,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "1212",
  16,
  "MAHARANIPETA (WALTAIR)"
 ],
 [
  "2035",
  16,
  "BHIMADOLU"
 ],
 [
  "2896",
  16,
  "MUNAGAPAKA (KOTTURU)"
 ],
 [
  "0571",
  16,
  "MANDASA (PALASA)"
 ],
 [
  "2012",
  16,
  "NGOS COLONY (TANUKU)"
 ],
 [
  "6619",
  16,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "R123",
  16,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "5110",
  16,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "2736",
  16,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "S128",
  16,
  "TERLAM (BADANGI)"
 ],
 [
  "7134",
  16,
  "UNGUTURU"
 ],
 [
  "0762",
  16,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "G327",
  16,
  "GURLA (NELLIMARLA)"
 ],
 [
  "3380",
  16,
  "SABBAVARAM-D2 (SABBAVARAM)"
 ],
 [
  "1353",
  16,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "0933",
  16,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "J011",
  16,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "C135",
  16,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "G530",
  16,
  "NELLIMARLA"
 ],
 [
  "A252",
  16,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "7024",
  16,
  "ATTILI (TANUKU)"
 ],
 [
  "G415",
  16,
  "NELLIMARLA"
 ],
 [
  "4019",
  16,
  "RANGAPURAM (PEDAVEGI)"
 ],
 [
  "S713",
  16,
  "SALURU"
 ],
 [
  "R139",
  16,
  "VEERAGATTAM (PALAKONDA)"
 ],
 [
  "0057",
  16,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "0342",
  16,
  "RAJANAGARAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "2125",
  16,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "7131",
  16,
  "GOLLAGUDEM (UNGUTURU)"
 ],
 [
  "1329",
  16,
  "VIDYUTHSAKHA (OLD CITY)"
 ],
 [
  "C616",
  16,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "2904",
  16,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "D019",
  16,
  "ANAKAPALLI (ANAKAPALLE)"
 ],
 [
  "9312",
  16,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "G518",
  15,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "B111",
  15,
  "BHOGAPURAM"
 ],
 [
  "0839",
  15,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "00V4",
  15,
  "VADLAPUDI (AUTONAGAR)"
 ],
 [
  "7316",
  15,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "C603",
  15,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "0902",
  15,
  "MANDASA (PALASA)"
 ],
 [
  "4056",
  15,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "0077",
  15,
  "MANDASA (PALASA)"
 ],
 [
  "0737",
  15,
  "UNDI (AKIVEEDU)"
 ],
 [
  "T004",
  15,
  "CHITTIVALASA (BHEEMILI)"
 ],
 [
  "1326",
  15,
  "MAHARANIPETA (WALTAIR)"
 ],
 [
  "0178",
  15,
  "CHAGALLU (KOVVURU)"
 ],
 [
  "A400",
  15,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "1204",
  15,
  "AKKAYYAPALEM (DONDAPARTHY)"
 ],
 [
  "A282",
  15,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "A302",
  15,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "S249",
  15,
  "GARA (SRIKAKULAM)"
 ],
 [
  "B600",
  15,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "P208",
  15,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "4524",
  15,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "2903",
  15,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "2170",
  15,
  "SIMHACHALAM (GOPALAPATNAM)"
 ],
 [
  "0936",
  15,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "H823",
  15,
  "NATHAVARAM"
 ],
 [
  "0398",
  15,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "1045",
  15,
  "VIJAYARAI (PEDAVEGI)"
 ],
 [
  "B228",
  15,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "4818",
  15,
  "TALLAREVU (KARAPA)"
 ],
 [
  "1405",
  15,
  "KANCHARAPALEM"
 ],
 [
  "T381",
  15,
  "TEKKALI"
 ],
 [
  "1312",
  15,
  "CHATAPARRU (DENDULURU)"
 ],
 [
  "6022",
  15,
  "DWARAKA TIRUMALA (BHIMADOLU)"
 ],
 [
  "I313",
  15,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "C303",
  15,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "S218",
  15,
  "GARA (SRIKAKULAM)"
 ],
 [
  "2003",
  15,
  "NGOS COLONY (TANUKU)"
 ],
 [
  "C377",
  15,
  "GAJAPATHINAGARAM"
 ],
 [
  "T301",
  15,
  "TEKKALI"
 ],
 [
  "2228",
  15,
  "KAJULURU (KARAPA)"
 ],
 [
  "J318",
  15,
  "PONDURU (ETCHERLA)"
 ],
 [
  "4020",
  15,
  "RANGAPURAM (PEDAVEGI)"
 ],
 [
  "A229",
  15,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "I945",
  15,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "C106",
  15,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "I119",
  15,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "P015",
  15,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "1032",
  15,
  "NARSAPURAM"
 ],
 [
  "0919",
  15,
  "PRAKASHAM CHOWK (BHIMAVARAM)"
 ],
 [
  "S729",
  15,
  "SALURU"
 ],
 [
  "V430",
  15,
  "S.KOTA"
 ],
 [
  "S075",
  15,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "0636",
  15,
  "DEVARPALLI (GOPALAPURAM)"
 ],
 [
  "2282",
  15,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "0569",
  15,
  "GOPALAPURAM"
 ],
 [
  "0716",
  15,
  "KAVITI (SOMPETA)"
 ],
 [
  "S223",
  15,
  "GARA (SRIKAKULAM)"
 ],
 [
  "2135",
  15,
  "PEDAPADU (DENDULURU)"
 ],
 [
  "B183",
  15,
  "BHOGAPURAM"
 ],
 [
  "S258",
  15,
  "GARA (SRIKAKULAM)"
 ],
 [
  "3053",
  15,
  "BORRAMPALEM (KAMAVARAPUKOTA)"
 ],
 [
  "6204",
  15,
  "MORAMPUDI"
 ],
 [
  "8005",
  15,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "G102",
  15,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "I420",
  15,
  "ETCHERLA"
 ],
 [
  "0739",
  15,
  "UNDI (AKIVEEDU)"
 ],
 [
  "P110",
  15,
  "PALAKONDA"
 ],
 [
  "0538",
  15,
  "AKIVEEDU"
 ],
 [
  "8846",
  15,
  "JNPC-PARAWADA"
 ],
 [
  "M030",
  15,
  "MADHURAWADA"
 ],
 [
  "3359",
  15,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "S323",
  15,
  "RAMBADRAPURAM (BADANGI)"
 ],
 [
  "3840",
  15,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "8804",
  15,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "1254",
  15,
  "AKKAYYAPALEM (DONDAPARTHY)"
 ],
 [
  "I401",
  15,
  "ETCHERLA"
 ],
 [
  "1714",
  15,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "2136",
  15,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "N305",
  15,
  "NARASANNAPETA"
 ],
 [
  "3504",
  15,
  "Y RAMAVARAM (RAMPACHODAVARAM RURAL)"
 ],
 [
  "R013",
  14,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "J154",
  14,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "7308",
  14,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "G514",
  14,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "8404",
  14,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "V139",
  14,
  "VEPADA (S.KOTA)"
 ],
 [
  "G525",
  14,
  "PAYAKARAOPETA (PAYAKARAO PETA)"
 ],
 [
  "0GAZ",
  14,
  "GAJUWAKA"
 ],
 [
  "0584",
  14,
  "GOPALAPURAM"
 ],
 [
  "8843",
  14,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "0723",
  14,
  "UNDI (AKIVEEDU)"
 ],
 [
  "3342",
  14,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "J161",
  14,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "00K7",
  14,
  "KURMANNAPALEM (AUTONAGAR)"
 ],
 [
  "D101",
  14,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "0245",
  14,
  "PALAKODERU"
 ],
 [
  "1125",
  14,
  "GANAPAVARAM (PEDATADEPALLI)"
 ],
 [
  "2611",
  14,
  "DWARAPUDI (MANDAPETA)"
 ],
 [
  "G015",
  14,
  "SAGARNAGAR (MADHURAWADA)"
 ],
 [
  "1319",
  14,
  "VIDYUTHSAKHA (OLD CITY)"
 ],
 [
  "S073",
  14,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "4606",
  14,
  "KARAPA"
 ],
 [
  "A600",
  14,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "J001",
  14,
  "CHEEDIKADA (MADUGULA)"
 ],
 [
  "J114",
  14,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "J050",
  14,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "B200",
  14,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "7132",
  14,
  "GOLLAGUDEM (UNGUTURU)"
 ],
 [
  "B300",
  14,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "A210",
  14,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "K034",
  14,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "C351",
  14,
  "GAJAPATHINAGARAM"
 ],
 [
  "R106",
  14,
  "VEERAGATTAM (PALAKONDA)"
 ],
 [
  "V115",
  14,
  "VEPADA (S.KOTA)"
 ],
 [
  "T005",
  14,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "0337",
  14,
  "KAVITI (SOMPETA)"
 ],
 [
  "1325",
  14,
  "VIDYUTHSAKHA (OLD CITY)"
 ],
 [
  "M004",
  14,
  "RAJAM"
 ],
 [
  "3343",
  14,
  "SABBAVARAM-D2 (SABBAVARAM)"
 ],
 [
  "S253",
  14,
  "GARA (SRIKAKULAM)"
 ],
 [
  "C136",
  14,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "J113",
  14,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "S652",
  14,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "2511",
  14,
  "MANDAPETA"
 ],
 [
  "K052",
  14,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "S610",
  14,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "V347",
  14,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "0133",
  14,
  "NIDADAVOLE"
 ],
 [
  "8122",
  14,
  "NELLIPAKA (CHINTOOR)"
 ],
 [
  "2507",
  14,
  "YEDIDA (MANDAPETA)"
 ],
 [
  "3333",
  14,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "P111",
  14,
  "PALAKONDA"
 ],
 [
  "C104",
  14,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "0863",
  14,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "H814",
  14,
  "NATHAVARAM"
 ],
 [
  "0736",
  14,
  "SUJATHANAGAR (PENDURTHI)"
 ],
 [
  "G006",
  14,
  "BUTCHAYYAPETA (MADUGULA)"
 ],
 [
  "P202",
  14,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "I918",
  14,
  "NARSIPATNAM"
 ],
 [
  "0432",
  14,
  "TADERU (PALAKODERU)"
 ],
 [
  "C305",
  14,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "G531",
  14,
  "NELLIMARLA"
 ],
 [
  "S241",
  14,
  "GARA (SRIKAKULAM)"
 ],
 [
  "0075",
  14,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "0832",
  14,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "5527",
  14,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "3813",
  14,
  "MURALINAGAR (KANCHARAPALEM)"
 ],
 [
  "K747",
  14,
  "KOTABOMMALI"
 ],
 [
  "N013",
  14,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "I123",
  14,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "0044",
  14,
  "MANDASA (PALASA)"
 ],
 [
  "B392",
  14,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "S259",
  14,
  "GARA (SRIKAKULAM)"
 ],
 [
  "N038",
  14,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "S321",
  14,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "S005",
  14,
  "ANANDAPURAM"
 ],
 [
  "M116",
  14,
  "BODDAM (RAJAM)"
 ],
 [
  "4201",
  14,
  "MOGALTURU (NARSAPURAM)"
 ],
 [
  "6631",
  14,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "A110",
  14,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "0718",
  13,
  "GOLLAPROLU (PITHAPURAM)"
 ],
 [
  "4055",
  13,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "G517",
  13,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "6212",
  13,
  "MORAMPUDI"
 ],
 [
  "4526",
  13,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "6647",
  13,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "2717",
  13,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "0261",
  13,
  "BUTTAIGUDEM (POLAVARAM)"
 ],
 [
  "G228",
  13,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "7216",
  13,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "3035",
  13,
  "T-NARSAPURAM (KAMAVARAPUKOTA)"
 ],
 [
  "3839",
  13,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "S328",
  13,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "A057",
  13,
  "ARILOVA (GOPALAPATNAM)"
 ],
 [
  "5530",
  13,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "3811",
  13,
  "MURALINAGAR (KANCHARAPALEM)"
 ],
 [
  "2169",
  13,
  "SIMHACHALAM (GOPALAPATNAM)"
 ],
 [
  "B500",
  13,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "B007",
  13,
  "ANANDAPURAM"
 ],
 [
  "0852",
  13,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "0837",
  13,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "0856",
  13,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "G541",
  13,
  "NELLIMARLA"
 ],
 [
  "2813",
  13,
  "PODURU (PALAKOL)"
 ],
 [
  "3012",
  13,
  "TETALI (TANUKU)"
 ],
 [
  "2243",
  13,
  "KAJULURU (KARAPA)"
 ],
 [
  "0906",
  13,
  "THONDANGI (TUNI)"
 ],
 [
  "G010",
  13,
  "BUTCHAYYAPETA (MADUGULA)"
 ],
 [
  "2311",
  13,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "0230",
  13,
  "KANCHILI (SOMPETA)"
 ],
 [
  "I928",
  13,
  "NARSIPATNAM"
 ],
 [
  "5252",
  13,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "T315",
  13,
  "TEKKALI"
 ],
 [
  "V010",
  13,
  "CHITTIVALASA (BHEEMILI)"
 ],
 [
  "3809",
  13,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "5232",
  13,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "T055",
  13,
  "THATICHETLAPALEM (DONDAPARTHY)"
 ],
 [
  "CH04",
  13,
  "CHIPURUPALLI"
 ],
 [
  "S009",
  13,
  "SAGARNAGAR (MADHURAWADA)"
 ],
 [
  "1457",
  13,
  "KANCHARAPALEM"
 ],
 [
  "A012",
  13,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "I338",
  13,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "0143",
  13,
  "PENTAPADU (TADEPALLIGUDEM)"
 ],
 [
  "7324",
  13,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "0529",
  13,
  "LAKKAVARAM (JANGAREDDYGUDEM)"
 ],
 [
  "0130",
  13,
  "KALLA (AKIVEEDU)"
 ],
 [
  "0279",
  13,
  "KASIBUGGA (PALASA)"
 ],
 [
  "7908",
  13,
  "KONTHAMURU (RAJAMAHENDRAVARAM)"
 ],
 [
  "V405",
  13,
  "S.KOTA"
 ],
 [
  "I288",
  13,
  "RANASTHALAM"
 ],
 [
  "I242",
  13,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "V125",
  13,
  "VEPADA (S.KOTA)"
 ],
 [
  "0136",
  13,
  "NIDADAVOLE"
 ],
 [
  "M014",
  13,
  "ANANDAPURAM"
 ],
 [
  "0281",
  13,
  "KANCHILI (SOMPETA)"
 ],
 [
  "P025",
  13,
  "PM PALEM (MADHURAWADA)"
 ],
 [
  "8408",
  13,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "1222",
  13,
  "MAHARANIPETA (WALTAIR)"
 ],
 [
  "S616",
  13,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "2133",
  13,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "S310",
  13,
  "RAMBADRAPURAM (BADANGI)"
 ],
 [
  "G007",
  13,
  "VENKANNAPALEM (CHODAVARAM)"
 ],
 [
  "I153",
  13,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "J021",
  13,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "S105",
  13,
  "TERLAM (BADANGI)"
 ],
 [
  "A278",
  13,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "0980",
  13,
  "MANDASA (PALASA)"
 ],
 [
  "M129",
  13,
  "BODDAM (RAJAM)"
 ],
 [
  "K714",
  13,
  "KOTABOMMALI"
 ],
 [
  "7313",
  13,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "R002",
  13,
  "K.KOTAPADU (CHODAVARAM)"
 ],
 [
  "D003",
  13,
  "BUTCHAYYAPETA (MADUGULA)"
 ],
 [
  "6123",
  13,
  "BHAGYALAKSHMIPETA (TADEPALLIGUDEM)"
 ],
 [
  "0862",
  13,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "0343",
  13,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "0377",
  13,
  "JEELUGUMILLI"
 ],
 [
  "B232",
  13,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "J211",
  13,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "B105",
  13,
  "BHOGAPURAM"
 ],
 [
  "0270",
  13,
  "MANDASA (PALASA)"
 ],
 [
  "B800",
  13,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "3057",
  13,
  "BORRAMPALEM (KAMAVARAPUKOTA)"
 ],
 [
  "C137",
  13,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "D201",
  13,
  "MENTADA (GAJAPATHINAGARAM)"
 ],
 [
  "P204",
  13,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "B223",
  13,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "A230",
  13,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "B044",
  13,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "H816",
  13,
  "NATHAVARAM"
 ],
 [
  "J046",
  13,
  "AMADALAVALASA"
 ],
 [
  "B256",
  13,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "A260",
  13,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "0323",
  13,
  "RAJANAGARAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "7786",
  13,
  "AGANAMPUDI"
 ],
 [
  "I423",
  13,
  "ETCHERLA"
 ],
 [
  "N132",
  13,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "1404",
  13,
  "KANCHARAPALEM"
 ],
 [
  "B225",
  13,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "I934",
  13,
  "NARSIPATNAM"
 ],
 [
  "M104",
  13,
  "BODDAM (RAJAM)"
 ],
 [
  "2006",
  13,
  "NGOS COLONY (TANUKU)"
 ],
 [
  "5134",
  13,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "G224",
  12,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "2709",
  12,
  "ACHANTA"
 ],
 [
  "J406",
  12,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "4521",
  12,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "C610",
  12,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "1321",
  12,
  "VIDYUTHSAKHA (OLD CITY)"
 ],
 [
  "4513",
  12,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "C324",
  12,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "HB08",
  12,
  "HB COLONY (SEETHAMMADHARA)"
 ],
 [
  "8012",
  12,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "K021",
  12,
  "KOMMADI (MADHURAWADA)"
 ],
 [
  "V533",
  12,
  "JAMI (S.KOTA)"
 ],
 [
  "3120",
  12,
  "YELESWARAM (PRATHIPADU)"
 ],
 [
  "1285",
  12,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "0521",
  12,
  "ANNAVARAM (TUNI)"
 ],
 [
  "4312",
  12,
  "JAGANNAICKPUR (SARPAVARAM)"
 ],
 [
  "4825",
  12,
  "TALLAREVU (KARAPA)"
 ],
 [
  "I437",
  12,
  "P.N.COLONY (SRIKAKULAM)"
 ],
 [
  "B338",
  12,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "3129",
  12,
  "SITARAMAPURAM (NARSAPURAM)"
 ],
 [
  "4814",
  12,
  "TALLAREVU (KARAPA)"
 ],
 [
  "K005",
  12,
  "BHEEMILI"
 ],
 [
  "2706",
  12,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "N051",
  12,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "0257",
  12,
  "BUTTAIGUDEM (POLAVARAM)"
 ],
 [
  "D132",
  12,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "I265",
  12,
  "RANASTHALAM"
 ],
 [
  "4810",
  12,
  "TALLAREVU (KARAPA)"
 ],
 [
  "5508",
  12,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "0537",
  12,
  "THONDANGI (TUNI)"
 ],
 [
  "S703",
  12,
  "SALURU"
 ],
 [
  "M131",
  12,
  "BODDAM (RAJAM)"
 ],
 [
  "I428",
  12,
  "P.N.COLONY (SRIKAKULAM)"
 ],
 [
  "2173",
  12,
  "SIMHACHALAM (GOPALAPATNAM)"
 ],
 [
  "0020",
  12,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "S319",
  12,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "1113",
  12,
  "KOTADIBBA (ELURU)"
 ],
 [
  "I167",
  12,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "J433",
  12,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "S330",
  12,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "B241",
  12,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "P027",
  12,
  "ELAMANCHILI"
 ],
 [
  "2216",
  12,
  "MUNAGAPAKA (KOTTURU)"
 ],
 [
  "K056",
  12,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "V366",
  12,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "B047",
  12,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "4607",
  12,
  "KARAPA"
 ],
 [
  "C346",
  12,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "C015",
  12,
  "MADHURAWADA"
 ],
 [
  "S728",
  12,
  "SALURU"
 ],
 [
  "V129",
  12,
  "VEPADA (S.KOTA)"
 ],
 [
  "J083",
  12,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "I159",
  12,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "1121",
  12,
  "GANAPAVARAM (PEDATADEPALLI)"
 ],
 [
  "6011",
  12,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "S347",
  12,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "0557",
  12,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "2325",
  12,
  "DENDULURU"
 ],
 [
  "N033",
  12,
  "SANTAKAVITI (RAJAM)"
 ],
 [
  "V306",
  12,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "0322",
  12,
  "VEERAVASARAM (PALAKODERU)"
 ],
 [
  "P220",
  12,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "J139",
  12,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "3204",
  12,
  "KUKKUNURU (JEELUGUMILLI)"
 ],
 [
  "8006",
  12,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "A238",
  12,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "G607",
  12,
  "P.N.COLONY (SRIKAKULAM)"
 ],
 [
  "A036",
  12,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "I360",
  12,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "N011",
  12,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "G725",
  12,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "1282",
  12,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "V463",
  12,
  "S.KOTA"
 ],
 [
  "A300",
  12,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "J346",
  12,
  "PONDURU (ETCHERLA)"
 ],
 [
  "J033",
  12,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "3365",
  12,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "B227",
  12,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "V444",
  12,
  "S.KOTA"
 ],
 [
  "N006",
  12,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "0481",
  12,
  "MANDASA (PALASA)"
 ],
 [
  "F644",
  12,
  "KOYYURU (CHINTAPALLI)"
 ],
 [
  "1308",
  12,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "T208",
  12,
  "THATICHETLAPALEM (DONDAPARTHY)"
 ],
 [
  "I431",
  12,
  "ETCHERLA"
 ],
 [
  "I915",
  12,
  "NARSIPATNAM"
 ],
 [
  "P131",
  12,
  "PALAKONDA"
 ],
 [
  "0370",
  12,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "S216",
  12,
  "BADANGI"
 ],
 [
  "K012",
  12,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "G419",
  12,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "B508",
  12,
  "SIRIPURAM (WALTAIR)"
 ],
 [
  "M027",
  12,
  "MADDILAPALEM (SEETHAMMADHARA)"
 ],
 [
  "1322",
  12,
  "VIDYUTHSAKHA (OLD CITY)"
 ],
 [
  "I253",
  12,
  "RANASTHALAM"
 ],
 [
  "R102",
  12,
  "VEERAGATTAM (PALAKONDA)"
 ],
 [
  "D178",
  12,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "5106",
  12,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "B216",
  12,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "H856",
  12,
  "NATHAVARAM"
 ],
 [
  "V339",
  12,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "P133",
  12,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "V229",
  12,
  "L.KOTA (S.KOTA)"
 ],
 [
  "8860",
  12,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "J003",
  12,
  "MADUGULA"
 ],
 [
  "0286",
  12,
  "VEERAVASARAM (PALAKODERU)"
 ],
 [
  "B330",
  12,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "C154",
  12,
  "DATTI RAJERU (GAJAPATHINAGARAM)"
 ],
 [
  "1271",
  12,
  "GANGAVARAM-VSKP (MALKAPURAM)"
 ],
 [
  "S663",
  12,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "1272",
  12,
  "GANGAVARAM-VSKP (MALKAPURAM)"
 ],
 [
  "J142",
  12,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "2518",
  12,
  "MANDAPETA"
 ],
 [
  "S204",
  12,
  "BALIJIPETA (PARVATHIPURAM)"
 ],
 [
  "9125",
  12,
  "CHINTOOR"
 ],
 [
  "J742",
  12,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "N061",
  11,
  "SANTAKAVITI (RAJAM)"
 ],
 [
  "V459",
  11,
  "S.KOTA"
 ],
 [
  "D229",
  11,
  "MENTADA (GAJAPATHINAGARAM)"
 ],
 [
  "N018",
  11,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "V303",
  11,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "1328",
  11,
  "VIDYUTHSAKHA (OLD CITY)"
 ],
 [
  "3350",
  11,
  "SABBAVARAM-D2 (SABBAVARAM)"
 ],
 [
  "0754",
  11,
  "KOYYALAGUDEM (POLAVARAM)"
 ],
 [
  "J405",
  11,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "B258",
  11,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "4516",
  11,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "G712",
  11,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "1764",
  11,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "J123",
  11,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "3807",
  11,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "4832",
  11,
  "TALLAREVU (KARAPA)"
 ],
 [
  "3023",
  11,
  "BORRAMPALEM (KAMAVARAPUKOTA)"
 ],
 [
  "K466",
  11,
  "KURUPAM (KURUPAM ITDA)"
 ],
 [
  "0264",
  11,
  "I.POLAVARAM (MUMMIDIVARAM)"
 ],
 [
  "4838",
  11,
  "TALLAREVU (KARAPA)"
 ],
 [
  "B378",
  11,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "4609",
  11,
  "KARAPA"
 ],
 [
  "0705",
  11,
  "MANDASA (PALASA)"
 ],
 [
  "7212",
  11,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "0375",
  11,
  "JEELUGUMILLI"
 ],
 [
  "2231",
  11,
  "KAJULURU (KARAPA)"
 ],
 [
  "M110",
  11,
  "BODDAM (RAJAM)"
 ],
 [
  "N058",
  11,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "B337",
  11,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "C376",
  11,
  "GAJAPATHINAGARAM"
 ],
 [
  "HB02",
  11,
  "HB COLONY (SEETHAMMADHARA)"
 ],
 [
  "2269",
  11,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "4520",
  11,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "3805",
  11,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "2316",
  11,
  "DENDULURU"
 ],
 [
  "A276",
  11,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "2008",
  11,
  "GANGAVARAM (RAMPACHODAVARAM)"
 ],
 [
  "P126",
  11,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "R007",
  11,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "0038",
  11,
  "MANDASA (PALASA)"
 ],
 [
  "B049",
  11,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "A030",
  11,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "P047",
  11,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "C336",
  11,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "0189",
  11,
  "BUTTAIGUDEM (POLAVARAM)"
 ],
 [
  "3019",
  11,
  "TETALI (TANUKU)"
 ],
 [
  "0565",
  11,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "2013",
  11,
  "NGOS COLONY (TANUKU)"
 ],
 [
  "G128",
  11,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "J315",
  11,
  "PONDURU (ETCHERLA)"
 ],
 [
  "D203",
  11,
  "MENTADA (GAJAPATHINAGARAM)"
 ],
 [
  "2906",
  11,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "0766",
  11,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "B131",
  11,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "0858",
  11,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "N028",
  11,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "B260",
  11,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "3841",
  11,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "1288",
  11,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "A205",
  11,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "C204",
  11,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "B221",
  11,
  "BHAMINI (PALAKONDA)"
 ],
 [
  "0876",
  11,
  "KAVITI (SOMPETA)"
 ],
 [
  "M118",
  11,
  "BODDAM (RAJAM)"
 ],
 [
  "N306",
  11,
  "NARASANNAPETA"
 ],
 [
  "S236",
  11,
  "GARA (SRIKAKULAM)"
 ],
 [
  "G705",
  11,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "C001",
  11,
  "PALAKONDA"
 ],
 [
  "0258",
  11,
  "BUTTAIGUDEM (POLAVARAM)"
 ],
 [
  "2132",
  11,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "0562",
  11,
  "GOPALAPURAM"
 ],
 [
  "1109",
  11,
  "KOTADIBBA (ELURU)"
 ],
 [
  "2817",
  11,
  "PODURU (PALAKOL)"
 ],
 [
  "3814",
  11,
  "MURALINAGAR (KANCHARAPALEM)"
 ],
 [
  "V414",
  11,
  "S.KOTA"
 ],
 [
  "C323",
  11,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "1501",
  11,
  "ELAMANCHILI"
 ],
 [
  "3010",
  11,
  "TETALI (TANUKU)"
 ],
 [
  "B355",
  11,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "G143",
  11,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "2014",
  11,
  "NGOS COLONY (TANUKU)"
 ],
 [
  "V365",
  11,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "0657",
  11,
  "POLAVARAM"
 ],
 [
  "C328",
  11,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "C304",
  11,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "S219",
  11,
  "GARA (SRIKAKULAM)"
 ],
 [
  "C334",
  11,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "J146",
  11,
  "SARUBUJJILI (AMADALAVALASA)"
 ],
 [
  "V135",
  11,
  "VEPADA (S.KOTA)"
 ],
 [
  "2312",
  11,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "B332",
  11,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "N066",
  11,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "A281",
  11,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "C140",
  11,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "B219",
  11,
  "BHAMINI (PALAKONDA)"
 ],
 [
  "I125",
  11,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "S247",
  11,
  "GARA (SRIKAKULAM)"
 ],
 [
  "G337",
  11,
  "GURLA (NELLIMARLA)"
 ],
 [
  "2015",
  11,
  "BHIMADOLU"
 ],
 [
  "1218",
  11,
  "MAHARANIPETA (WALTAIR)"
 ],
 [
  "K752",
  11,
  "KOTABOMMALI"
 ],
 [
  "B377",
  11,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "8135",
  11,
  "NELLIPAKA (CHINTOOR)"
 ],
 [
  "S611",
  11,
  "PACHIPENTA (SALURU)"
 ],
 [
  "0554",
  11,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "C653",
  11,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "N005",
  11,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "C138",
  11,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "0576",
  11,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "C016",
  11,
  "ATCHUTHAPURAM"
 ],
 [
  "J102",
  11,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "5525",
  11,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "2119",
  11,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "N040",
  11,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "2735",
  11,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "S435",
  11,
  "MAKKUVA (SALURU)"
 ],
 [
  "J019",
  11,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "S243",
  11,
  "GARA (SRIKAKULAM)"
 ],
 [
  "I911",
  11,
  "NARSIPATNAM"
 ],
 [
  "8411",
  11,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "0329",
  11,
  "KANCHILI (SOMPETA)"
 ],
 [
  "A058",
  11,
  "ARILOVA (GOPALAPATNAM)"
 ],
 [
  "9238",
  11,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "8802",
  10,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "5531",
  10,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "G512",
  10,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "K020",
  10,
  "BHEEMILI"
 ],
 [
  "0586",
  10,
  "KASIBUGGA (PALASA)"
 ],
 [
  "C630",
  10,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "0958",
  10,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "B261",
  10,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "0192",
  10,
  "JAGGAMPETA"
 ],
 [
  "6121",
  10,
  "BHAGYALAKSHMIPETA (TADEPALLIGUDEM)"
 ],
 [
  "2224",
  10,
  "KAJULURU (KARAPA)"
 ],
 [
  "0GBT",
  10,
  "GAJUWAKA"
 ],
 [
  "0851",
  10,
  "SANKHAVARAM (PRATHIPADU)"
 ],
 [
  "4624",
  10,
  "KARAPA"
 ],
 [
  "0920",
  10,
  "PRAKASHAM CHOWK (BHIMAVARAM)"
 ],
 [
  "2721",
  10,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "7319",
  10,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "N126",
  10,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "S072",
  10,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "S257",
  10,
  "GARA (SRIKAKULAM)"
 ],
 [
  "0453",
  10,
  "TADUVAI (JANGAREDDYGUDEM)"
 ],
 [
  "1306",
  10,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "0282",
  10,
  "VEERAVASARAM (PALAKODERU)"
 ],
 [
  "N125",
  10,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "GV07",
  10,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "B358",
  10,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "00C5",
  10,
  "CHINAGANTYADA (GAJUWAKA)"
 ],
 [
  "S682",
  10,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "0033",
  10,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "0423",
  10,
  "SANKHAVARAM (PRATHIPADU)"
 ],
 [
  "K001",
  10,
  "BHEEMILI"
 ],
 [
  "7512",
  10,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "G112",
  10,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "1456",
  10,
  "KANCHARAPALEM"
 ],
 [
  "1324",
  10,
  "VIDYUTHSAKHA (OLD CITY)"
 ],
 [
  "J069",
  10,
  "AMADALAVALASA"
 ],
 [
  "J035",
  10,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "C318",
  10,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "S331",
  10,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "J151",
  10,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "K063",
  10,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "0137",
  10,
  "NIDADAVOLE"
 ],
 [
  "A500",
  10,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "3339",
  10,
  "SABBAVARAM-D2 (SABBAVARAM)"
 ],
 [
  "0362",
  10,
  "MUMMIDIVARAM"
 ],
 [
  "T372",
  10,
  "TEKKALI"
 ],
 [
  "GV18",
  10,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "0738",
  10,
  "UNDI (AKIVEEDU)"
 ],
 [
  "T369",
  10,
  "TEKKALI"
 ],
 [
  "0785",
  10,
  "KAVITI (SOMPETA)"
 ],
 [
  "0661",
  10,
  "SAKHINETIPALLI (RAZOLE)"
 ],
 [
  "2280",
  10,
  "SUJATHANAGAR (PENDURTHI)"
 ],
 [
  "I554",
  10,
  "P.N.COLONY (SRIKAKULAM)"
 ],
 [
  "I151",
  10,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "A279",
  10,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "M126",
  10,
  "BODDAM (RAJAM)"
 ],
 [
  "G004",
  10,
  "BUTCHAYYAPETA (MADUGULA)"
 ],
 [
  "J119",
  10,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "3021",
  10,
  "TETALI (TANUKU)"
 ],
 [
  "S239",
  10,
  "GARA (SRIKAKULAM)"
 ],
 [
  "1039",
  10,
  "VIJAYARAI (PEDAVEGI)"
 ],
 [
  "6612",
  10,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "G715",
  10,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "T367",
  10,
  "TEKKALI"
 ],
 [
  "I354",
  10,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "0771",
  10,
  "UPPALAGUPTAM (MUMMIDIVARAM)"
 ],
 [
  "G009",
  10,
  "K.KOTAPADU (CHODAVARAM)"
 ],
 [
  "V318",
  10,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "S604",
  10,
  "PACHIPENTA (SALURU)"
 ],
 [
  "HB03",
  10,
  "HB COLONY (SEETHAMMADHARA)"
 ],
 [
  "0274",
  10,
  "VEERAVASARAM (PALAKODERU)"
 ],
 [
  "0254",
  10,
  "I.POLAVARAM (MUMMIDIVARAM)"
 ],
 [
  "B136",
  10,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "1279",
  10,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "2274",
  10,
  "PENDURTHI"
 ],
 [
  "J156",
  10,
  "SARUBUJJILI (AMADALAVALASA)"
 ],
 [
  "S629",
  10,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "I245",
  10,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "CH17",
  10,
  "CHIPURUPALLI"
 ],
 [
  "B014",
  10,
  "ELAMANCHILI"
 ],
 [
  "2242",
  10,
  "KAJULURU (KARAPA)"
 ],
 [
  "0091",
  10,
  "MANDASA (PALASA)"
 ],
 [
  "C342",
  10,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "7760",
  10,
  "AGANAMPUDI"
 ],
 [
  "6636",
  10,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "D013",
  10,
  "ANAKAPALLI (ANAKAPALLE)"
 ],
 [
  "8847",
  10,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "A212",
  10,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "CH14",
  10,
  "CHIPURUPALLI"
 ],
 [
  "J116",
  10,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "V351",
  10,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "0897",
  10,
  "SOMPETA"
 ],
 [
  "V364",
  10,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "3340",
  10,
  "SABBAVARAM-D2 (SABBAVARAM)"
 ],
 [
  "S226",
  10,
  "BALIJIPETA (PARVATHIPURAM)"
 ],
 [
  "K709",
  10,
  "KOTABOMMALI"
 ],
 [
  "C321",
  10,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "3383",
  10,
  "SABBAVARAM-D2 (SABBAVARAM)"
 ],
 [
  "0664",
  10,
  "SAKHINETIPALLI (RAZOLE)"
 ],
 [
  "2279",
  10,
  "PENDURTHI"
 ],
 [
  "N115",
  10,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "I429",
  10,
  "ETCHERLA"
 ],
 [
  "L002",
  10,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "1286",
  10,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "00V2",
  10,
  "VADLAPUDI (AUTONAGAR)"
 ],
 [
  "D208",
  10,
  "MENTADA (GAJAPATHINAGARAM)"
 ],
 [
  "GV40",
  10,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "G011",
  10,
  "K.KOTAPADU (CHODAVARAM)"
 ],
 [
  "1280",
  10,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "N119",
  10,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "3820",
  10,
  "MURALINAGAR (KANCHARAPALEM)"
 ],
 [
  "B259",
  10,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "J322",
  10,
  "PONDURU (ETCHERLA)"
 ],
 [
  "3209",
  10,
  "SITARAMAPURAM (NARSAPURAM)"
 ],
 [
  "2731",
  10,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "4209",
  10,
  "MOGALTURU (NARSAPURAM)"
 ],
 [
  "S210",
  10,
  "BALIJIPETA (PARVATHIPURAM)"
 ],
 [
  "D276",
  10,
  "MENTADA (GAJAPATHINAGARAM)"
 ],
 [
  "K707",
  10,
  "KOTABOMMALI"
 ],
 [
  "1036",
  10,
  "RAMPACHODAVARAM"
 ],
 [
  "3020",
  10,
  "TETALI (TANUKU)"
 ],
 [
  "6202",
  10,
  "MORAMPUDI"
 ],
 [
  "I239",
  10,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "3205",
  10,
  "KUKKUNURU (JEELUGUMILLI)"
 ],
 [
  "G206",
  9,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "G221",
  9,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "G215",
  9,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "8412",
  9,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "J320",
  9,
  "PONDURU (ETCHERLA)"
 ],
 [
  "0912",
  9,
  "KAVITI (SOMPETA)"
 ],
 [
  "0536",
  9,
  "SANTHINAGAR (KAKINADA)"
 ],
 [
  "G526",
  9,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "G515",
  9,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "0953",
  9,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "I929",
  9,
  "NARSIPATNAM"
 ],
 [
  "1762",
  9,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "7218",
  9,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "0641",
  9,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "J005",
  9,
  "VENKANNAPALEM (CHODAVARAM)"
 ],
 [
  "2188",
  9,
  "GOPALAPATNAM"
 ],
 [
  "2809",
  9,
  "PODURU (PALAKOL)"
 ],
 [
  "P127",
  9,
  "PALAKONDA"
 ],
 [
  "S113",
  9,
  "TERLAM (BADANGI)"
 ],
 [
  "4604",
  9,
  "KARAPA"
 ],
 [
  "2508",
  9,
  "YEDIDA (MANDAPETA)"
 ],
 [
  "D233",
  9,
  "MENTADA (GAJAPATHINAGARAM)"
 ],
 [
  "A056",
  9,
  "ARILOVA (GOPALAPATNAM)"
 ],
 [
  "6648",
  9,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "V137",
  9,
  "VEPADA (S.KOTA)"
 ],
 [
  "R108",
  9,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "2351",
  9,
  "DENDULURU"
 ],
 [
  "I207",
  9,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "4058",
  9,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "0372",
  9,
  "JEELUGUMILLI"
 ],
 [
  "B254",
  9,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "S302",
  9,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "S230",
  9,
  "BADANGI"
 ],
 [
  "C387",
  9,
  "GAJAPATHINAGARAM"
 ],
 [
  "B575",
  9,
  "GARA (SRIKAKULAM)"
 ],
 [
  "5016",
  9,
  "PERAVALI (NIDADAVOLE)"
 ],
 [
  "3363",
  9,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "D031",
  9,
  "DONDAPARTHY"
 ],
 [
  "H866",
  9,
  "NATHAVARAM"
 ],
 [
  "B255",
  9,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "V208",
  9,
  "L.KOTA (S.KOTA)"
 ],
 [
  "A039",
  9,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "D007",
  9,
  "CHEEDIKADA (MADUGULA)"
 ],
 [
  "J451",
  9,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "C181",
  9,
  "DATTI RAJERU (GAJAPATHINAGARAM)"
 ],
 [
  "A508",
  9,
  "SIRIPURAM (WALTAIR)"
 ],
 [
  "1276",
  9,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "B277",
  9,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "B186",
  9,
  "BHOGAPURAM"
 ],
 [
  "4835",
  9,
  "TALLAREVU (KARAPA)"
 ],
 [
  "4614",
  9,
  "KARAPA"
 ],
 [
  "MM40",
  9,
  "MERAKAMUDIDAM (CHIPURUPALLI)"
 ],
 [
  "S711",
  9,
  "SALURU"
 ],
 [
  "G346",
  9,
  "GURLA (NELLIMARLA)"
 ],
 [
  "0978",
  9,
  "KASIBUGGA (PALASA)"
 ],
 [
  "B217",
  9,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "D187",
  9,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "6122",
  9,
  "BHAGYALAKSHMIPETA (TADEPALLIGUDEM)"
 ],
 [
  "A232",
  9,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "S653",
  9,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "S309",
  9,
  "RAMBADRAPURAM (BADANGI)"
 ],
 [
  "C203",
  9,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "G008",
  9,
  "ANANDAPURAM"
 ],
 [
  "1266",
  9,
  "GANGAVARAM-VSKP (MALKAPURAM)"
 ],
 [
  "B022",
  9,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "2335",
  9,
  "DENDULURU"
 ],
 [
  "J004",
  9,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "I935",
  9,
  "NARSIPATNAM"
 ],
 [
  "1459",
  9,
  "MALKIPURAM (RAZOLE)"
 ],
 [
  "V446",
  9,
  "S.KOTA"
 ],
 [
  "4805",
  9,
  "TALLAREVU (KARAPA)"
 ],
 [
  "GV02",
  9,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "P217",
  9,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "J210",
  9,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "A216",
  9,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "N054",
  9,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "P120",
  9,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "S603",
  9,
  "PACHIPENTA (SALURU)"
 ],
 [
  "8805",
  9,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "B331",
  9,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "0653",
  9,
  "SAKHINETIPALLI (RAZOLE)"
 ],
 [
  "A119",
  9,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "J111",
  9,
  "SARUBUJJILI (AMADALAVALASA)"
 ],
 [
  "P139",
  9,
  "PALAKONDA"
 ],
 [
  "S343",
  9,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "K743",
  9,
  "KOTABOMMALI"
 ],
 [
  "0431",
  9,
  "TADERU (PALAKODERU)"
 ],
 [
  "0614",
  9,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "S281",
  9,
  "GARA (SRIKAKULAM)"
 ],
 [
  "V434",
  9,
  "S.KOTA"
 ],
 [
  "4023",
  9,
  "RANGAPURAM (PEDAVEGI)"
 ],
 [
  "0589",
  9,
  "MANDASA (PALASA)"
 ],
 [
  "2808",
  9,
  "PODURU (PALAKOL)"
 ],
 [
  "K411",
  9,
  "KURUPAM (KURUPAM ITDA)"
 ],
 [
  "D033",
  9,
  "DONDAPARTHY"
 ],
 [
  "8003",
  9,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "A231",
  9,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "3041",
  9,
  "T-NARSAPURAM (KAMAVARAPUKOTA)"
 ],
 [
  "2138",
  9,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "G710",
  9,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "0638",
  9,
  "DEVARPALLI (GOPALAPURAM)"
 ],
 [
  "G751",
  9,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "C149",
  9,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "S314",
  9,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "0367",
  9,
  "KASIBUGGA (PALASA)"
 ],
 [
  "G306",
  9,
  "GURLA (NELLIMARLA)"
 ],
 [
  "S418",
  9,
  "MAKKUVA (SALURU)"
 ],
 [
  "4059",
  9,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "V121",
  9,
  "VEPADA (S.KOTA)"
 ],
 [
  "0767",
  9,
  "UPPALAGUPTAM (MUMMIDIVARAM)"
 ],
 [
  "P124",
  9,
  "PALAKONDA"
 ],
 [
  "1158",
  9,
  "MALKAPURAM"
 ],
 [
  "V367",
  9,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "C623",
  9,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "0913",
  9,
  "KASIBUGGA (PALASA)"
 ],
 [
  "A236",
  9,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "L005",
  9,
  "CHODAVARAM"
 ],
 [
  "A504",
  9,
  "PEDAWALTAIR (WALTAIR)"
 ],
 [
  "S307",
  9,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "CH30",
  9,
  "CHIPURUPALLI"
 ],
 [
  "V522",
  9,
  "JAMI (S.KOTA)"
 ],
 [
  "1454",
  9,
  "KANCHARAPALEM"
 ],
 [
  "B036",
  9,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "J103",
  9,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "3206",
  9,
  "RAJAVOMMANGI (RAMPACHODAVARAM RURAL)"
 ],
 [
  "2302",
  9,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "C613",
  9,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "V423",
  9,
  "S.KOTA"
 ],
 [
  "T302",
  9,
  "TEKKALI"
 ],
 [
  "6015",
  9,
  "DWARAKA TIRUMALA (BHIMADOLU)"
 ],
 [
  "G405",
  9,
  "NELLIMARLA"
 ],
 [
  "S275",
  9,
  "GARA (SRIKAKULAM)"
 ],
 [
  "G318",
  9,
  "GURLA (NELLIMARLA)"
 ],
 [
  "9119",
  9,
  "CHINTOOR"
 ],
 [
  "0435",
  9,
  "MANDASA (PALASA)"
 ],
 [
  "3837",
  9,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "A242",
  9,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "2918",
  9,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "E755",
  9,
  "CHINTAPALLI"
 ],
 [
  "9219",
  9,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "3305",
  9,
  "ADDATEEGALA (RAMPACHODAVARAM RURAL)"
 ],
 [
  "P557",
  9,
  "PATHAPATNAM"
 ],
 [
  "9318",
  9,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "4523",
  9,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "2905",
  8,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "S270",
  8,
  "GARA (SRIKAKULAM)"
 ],
 [
  "7203",
  8,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "S408",
  8,
  "MAKKUVA (SALURU)"
 ],
 [
  "A015",
  8,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "0857",
  8,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "B280",
  8,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "0642",
  8,
  "KANDARADA (PITHAPURAM)"
 ],
 [
  "4615",
  8,
  "KARAPA"
 ],
 [
  "0854",
  8,
  "ROWTHULAPUDI (PRATHIPADU)"
 ],
 [
  "00AG",
  8,
  "CHINAGANTYADA (GAJUWAKA)"
 ],
 [
  "V322",
  8,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "0GBC",
  8,
  "GAJUWAKA"
 ],
 [
  "0449",
  8,
  "TADERU (PALAKODERU)"
 ],
 [
  "A206",
  8,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "S613",
  8,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "V421",
  8,
  "S.KOTA"
 ],
 [
  "0462",
  8,
  "TADUVAI (JANGAREDDYGUDEM)"
 ],
 [
  "0628",
  8,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "B406",
  8,
  "MVP (WALTAIR)"
 ],
 [
  "B137",
  8,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "0451",
  8,
  "TADUVAI (JANGAREDDYGUDEM)"
 ],
 [
  "D002",
  8,
  "MADUGULA"
 ],
 [
  "3801",
  8,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "N012",
  8,
  "THATITURU (BHEEMILI)"
 ],
 [
  "7121",
  8,
  "GOLLAGUDEM (UNGUTURU)"
 ],
 [
  "2251",
  8,
  "PENDURTHI"
 ],
 [
  "T023",
  8,
  "THATICHETLAPALEM (DONDAPARTHY)"
 ],
 [
  "5127",
  8,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "N059",
  8,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "S102",
  8,
  "TERLAM (BADANGI)"
 ],
 [
  "3017",
  8,
  "TETALI (TANUKU)"
 ],
 [
  "7120",
  8,
  "UNGUTURU"
 ],
 [
  "7322",
  8,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "0702",
  8,
  "UNDI (AKIVEEDU)"
 ],
 [
  "P037",
  8,
  "POOLBAGH (VIZIANAGARAM)"
 ],
 [
  "J425",
  8,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "GV26",
  8,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "1179",
  8,
  "DEVARPALLI (GOPALAPURAM)"
 ],
 [
  "5130",
  8,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "2174",
  8,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "S264",
  8,
  "GARA (SRIKAKULAM)"
 ],
 [
  "J075",
  8,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "S215",
  8,
  "GARA (SRIKAKULAM)"
 ],
 [
  "K054",
  8,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "J063",
  8,
  "AMADALAVALASA"
 ],
 [
  "H837",
  8,
  "NATHAVARAM"
 ],
 [
  "J006",
  8,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "I179",
  8,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "K066",
  8,
  "ATCHUTHAPURAM"
 ],
 [
  "0076",
  8,
  "SOMPETA"
 ],
 [
  "C330",
  8,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "0GHR",
  8,
  "GAJUWAKA"
 ],
 [
  "C333",
  8,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "M465",
  8,
  "MELIAPUTTI (PATHAPATNAM)"
 ],
 [
  "E587",
  8,
  "CHINTAPALLI"
 ],
 [
  "E863",
  8,
  "CHINTAPALLI"
 ],
 [
  "H005",
  8,
  "HUKUMPETA (PADERU)"
 ],
 [
  "J410",
  8,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "0GKR",
  8,
  "GAJUWAKA"
 ],
 [
  "D014",
  8,
  "ANAKAPALLI (ANAKAPALLE)"
 ],
 [
  "I170",
  8,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "0387",
  8,
  "PALASA"
 ],
 [
  "0356",
  8,
  "JEELUGUMILLI"
 ],
 [
  "C002",
  8,
  "BHEEMILI"
 ],
 [
  "S080",
  8,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "J064",
  8,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "V457",
  8,
  "S.KOTA"
 ],
 [
  "B242",
  8,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "8116",
  8,
  "NELLIPAKA (CHINTOOR)"
 ],
 [
  "B032",
  8,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "S797",
  8,
  "SALURU"
 ],
 [
  "B262",
  8,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "2223",
  8,
  "POOLAPALLI (PALAKOL)"
 ],
 [
  "G425",
  8,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "S718",
  8,
  "SALURU"
 ],
 [
  "C619",
  8,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "2230",
  8,
  "KAJULURU (KARAPA)"
 ],
 [
  "R234",
  8,
  "VANGARA (RAJAM)"
 ],
 [
  "4611",
  8,
  "KARAPA"
 ],
 [
  "G428",
  8,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "0039",
  8,
  "KAVITI (SOMPETA)"
 ],
 [
  "4807",
  8,
  "TALLAREVU (KARAPA)"
 ],
 [
  "V215",
  8,
  "L.KOTA (S.KOTA)"
 ],
 [
  "0390",
  8,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "B252",
  8,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "0827",
  8,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "I328",
  8,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "M101",
  8,
  "BODDAM (RAJAM)"
 ],
 [
  "4033",
  8,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "N034",
  8,
  "SANTAKAVITI (RAJAM)"
 ],
 [
  "S234",
  8,
  "GARA (SRIKAKULAM)"
 ],
 [
  "8844",
  8,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "V308",
  8,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "0585",
  8,
  "GOPALAPURAM"
 ],
 [
  "8004",
  8,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "6630",
  8,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "H841",
  8,
  "NATHAVARAM"
 ],
 [
  "S233",
  8,
  "GARA (SRIKAKULAM)"
 ],
 [
  "A248",
  8,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "1255",
  8,
  "GANGAVARAM-VSKP (MALKAPURAM)"
 ],
 [
  "I130",
  8,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "C620",
  8,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "M009",
  8,
  "MADUGULA"
 ],
 [
  "M012",
  8,
  "ANANDAPURAM"
 ],
 [
  "B234",
  8,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "0528",
  8,
  "LAKKAVARAM (JANGAREDDYGUDEM)"
 ],
 [
  "I161",
  8,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "K017",
  8,
  "DEVARAPALLI (CHODAVARAM)"
 ],
 [
  "H822",
  8,
  "NATHAVARAM"
 ],
 [
  "1703",
  8,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "8109",
  8,
  "NELLIPAKA (CHINTOOR)"
 ],
 [
  "R120",
  8,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "S083",
  8,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "I127",
  8,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "B019",
  8,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "V122",
  8,
  "K.KOTAPADU (CHODAVARAM)"
 ],
 [
  "D103",
  8,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "0439",
  8,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "G350",
  8,
  "GURLA (NELLIMARLA)"
 ],
 [
  "I251",
  8,
  "RANASTHALAM"
 ],
 [
  "2017",
  8,
  "BHIMADOLU"
 ],
 [
  "B263",
  8,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "S142",
  8,
  "TERLAM (BADANGI)"
 ],
 [
  "S318",
  8,
  "RAMBADRAPURAM (BADANGI)"
 ],
 [
  "2158",
  8,
  "SIMHACHALAM (GOPALAPATNAM)"
 ],
 [
  "V420",
  8,
  "S.KOTA"
 ],
 [
  "M444",
  8,
  "MELIAPUTTI (PATHAPATNAM)"
 ],
 [
  "S344",
  8,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "A043",
  8,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "G313",
  8,
  "GURLA (NELLIMARLA)"
 ],
 [
  "I419",
  8,
  "ETCHERLA"
 ],
 [
  "I166",
  8,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "K013",
  8,
  "CHEEDIKADA (MADUGULA)"
 ],
 [
  "0578",
  8,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "I511",
  8,
  "ETCHERLA"
 ],
 [
  "6117",
  8,
  "BHAGYALAKSHMIPETA (TADEPALLIGUDEM)"
 ],
 [
  "B051",
  8,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "6213",
  8,
  "MORAMPUDI"
 ],
 [
  "F633",
  8,
  "KOYYURU (CHINTAPALLI)"
 ],
 [
  "2187",
  8,
  "GOPALAPATNAM"
 ],
 [
  "6651",
  8,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "E519",
  8,
  "CHINTAPALLI"
 ],
 [
  "9211",
  8,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "M476",
  8,
  "MELIAPUTTI (PATHAPATNAM)"
 ],
 [
  "I506",
  8,
  "ETCHERLA"
 ],
 [
  "D693",
  8,
  "G.K.VEEDHI (CHINTAPALLI)"
 ],
 [
  "2262",
  7,
  "PENDURTHI"
 ],
 [
  "G235",
  7,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "1320",
  7,
  "VIDYUTHSAKHA (OLD CITY)"
 ],
 [
  "0782",
  7,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "G111",
  7,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "K728",
  7,
  "KOTABOMMALI"
 ],
 [
  "I920",
  7,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "6029",
  7,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "G243",
  7,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "7774",
  7,
  "AGANAMPUDI"
 ],
 [
  "0252",
  7,
  "RAJANAGARAM (RAJAMAHENDRAVARAM RURAL)"
 ],
 [
  "0853",
  7,
  "SANKHAVARAM (PRATHIPADU)"
 ],
 [
  "6625",
  7,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "4815",
  7,
  "TALLAREVU (KARAPA)"
 ],
 [
  "4522",
  7,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "5532",
  7,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "8813",
  7,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "J150",
  7,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "V210",
  7,
  "L.KOTA (S.KOTA)"
 ],
 [
  "4307",
  7,
  "JAGANNAICKPUR (SARPAVARAM)"
 ],
 [
  "0265",
  7,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "V340",
  7,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "7101",
  7,
  "ASR NAGAR (BHIMAVARAM)"
 ],
 [
  "CH40",
  7,
  "CHIPURUPALLI"
 ],
 [
  "S125",
  7,
  "TERLAM (BADANGI)"
 ],
 [
  "C750",
  7,
  "RAJAM"
 ],
 [
  "3046",
  7,
  "BORRAMPALEM (KAMAVARAPUKOTA)"
 ],
 [
  "G213",
  7,
  "DASANNAPETA (VIZIANAGARAM)"
 ],
 [
  "0333",
  7,
  "KAMAVARAPUKOTA"
 ],
 [
  "G733",
  7,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "C020",
  7,
  "MADHURAWADA"
 ],
 [
  "J027",
  7,
  "AMADALAVALASA"
 ],
 [
  "B700",
  7,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "V314",
  7,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "V243",
  7,
  "L.KOTA (S.KOTA)"
 ],
 [
  "7130",
  7,
  "UNGUTURU"
 ],
 [
  "J330",
  7,
  "PONDURU (ETCHERLA)"
 ],
 [
  "1281",
  7,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "C201",
  7,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "6205",
  7,
  "MORAMPUDI"
 ],
 [
  "J347",
  7,
  "PONDURU (ETCHERLA)"
 ],
 [
  "K062",
  7,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "2184",
  7,
  "GOPALAPATNAM"
 ],
 [
  "G418",
  7,
  "NELLIMARLA"
 ],
 [
  "I266",
  7,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "B112",
  7,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "0280",
  7,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "P141",
  7,
  "PALAKONDA"
 ],
 [
  "P506",
  7,
  "PATHAPATNAM"
 ],
 [
  "5129",
  7,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "I129",
  7,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "0GRM",
  7,
  "GAJUWAKA"
 ],
 [
  "7138",
  7,
  "UNGUTURU"
 ],
 [
  "J233",
  7,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "B025",
  7,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "B117",
  7,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "P222",
  7,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "G535",
  7,
  "NELLIMARLA"
 ],
 [
  "S262",
  7,
  "GARA (SRIKAKULAM)"
 ],
 [
  "A115",
  7,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "2605",
  7,
  "DWARAPUDI (MANDAPETA)"
 ],
 [
  "S087",
  7,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "A706",
  7,
  "MVP (WALTAIR)"
 ],
 [
  "0349",
  7,
  "TADIKALAPUDI (KAMAVARAPUKOTA)"
 ],
 [
  "0180",
  7,
  "MANDASA (PALASA)"
 ],
 [
  "V145",
  7,
  "VEPADA (S.KOTA)"
 ],
 [
  "0741",
  7,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "8008",
  7,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "3121",
  7,
  "SITARAMAPURAM (NARSAPURAM)"
 ],
 [
  "A126",
  7,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "I227",
  7,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "0328",
  7,
  "SOMPETA"
 ],
 [
  "A109",
  7,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "P570",
  7,
  "PATHAPATNAM"
 ],
 [
  "0581",
  7,
  "SOMPETA"
 ],
 [
  "0833",
  7,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "S139",
  7,
  "TERLAM (BADANGI)"
 ],
 [
  "N049",
  7,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "J746",
  7,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "J122",
  7,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "J362",
  7,
  "PONDURU (ETCHERLA)"
 ],
 [
  "1043",
  7,
  "VIJAYARAI (PEDAVEGI)"
 ],
 [
  "I165",
  7,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "3812",
  7,
  "MURALINAGAR (KANCHARAPALEM)"
 ],
 [
  "K737",
  7,
  "KOTABOMMALI"
 ],
 [
  "R121",
  7,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "J126",
  7,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "A041",
  7,
  "SEETHAMMADHARA"
 ],
 [
  "0030",
  7,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "G423",
  7,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "3351",
  7,
  "PEDAPADU (DENDULURU)"
 ],
 [
  "N103",
  7,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "1704",
  7,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "N148",
  7,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "3341",
  7,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "P260",
  7,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "3014",
  7,
  "TETALI (TANUKU)"
 ],
 [
  "G341",
  7,
  "GURLA (NELLIMARLA)"
 ],
 [
  "0073",
  7,
  "KANCHILI (SOMPETA)"
 ],
 [
  "S668",
  7,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "I168",
  7,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "G014",
  7,
  "CHODAVARAM"
 ],
 [
  "N031",
  7,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "C111",
  7,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "S010",
  7,
  "CHEEDIKADA (MADUGULA)"
 ],
 [
  "S143",
  7,
  "TERLAM (BADANGI)"
 ],
 [
  "S317",
  7,
  "RAMBADRAPURAM (BADANGI)"
 ],
 [
  "N014",
  7,
  "SANTAKAVITI (RAJAM)"
 ],
 [
  "T374",
  7,
  "TEKKALI"
 ],
 [
  "V111",
  7,
  "VEPADA (S.KOTA)"
 ],
 [
  "N015",
  7,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "N067",
  7,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "C147",
  7,
  "DATTI RAJERU (GAJAPATHINAGARAM)"
 ],
 [
  "M405",
  7,
  "MELIAPUTTI (PATHAPATNAM)"
 ],
 [
  "J407",
  7,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "0797",
  7,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "5506",
  7,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "V124",
  7,
  "VEPADA (S.KOTA)"
 ],
 [
  "7133",
  7,
  "GOLLAGUDEM (UNGUTURU)"
 ],
 [
  "G307",
  7,
  "GURLA (NELLIMARLA)"
 ],
 [
  "7107",
  7,
  "UNGUTURU"
 ],
 [
  "B011",
  7,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "0017",
  7,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "I922",
  7,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "6125",
  7,
  "BHAGYALAKSHMIPETA (TADEPALLIGUDEM)"
 ],
 [
  "2009",
  7,
  "NGOS COLONY (TANUKU)"
 ],
 [
  "K826",
  7,
  "KOTABOMMALI"
 ],
 [
  "6208",
  7,
  "MORAMPUDI"
 ],
 [
  "K824",
  7,
  "KOTABOMMALI"
 ],
 [
  "0283",
  7,
  "VEERAVASARAM (PALAKODERU)"
 ],
 [
  "8410",
  7,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "I299",
  7,
  "RANASTHALAM"
 ],
 [
  "E621",
  7,
  "CHINTAPALLI"
 ],
 [
  "9328",
  7,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "3131",
  7,
  "KUKKUNURU (JEELUGUMILLI)"
 ],
 [
  "2734",
  7,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "3401",
  7,
  "GANGAVARAM (RAMPACHODAVARAM)"
 ],
 [
  "9301",
  7,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "4827",
  7,
  "TALLAREVU (KARAPA)"
 ],
 [
  "D503",
  6,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "G212",
  6,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "1221",
  6,
  "ALLIPURAM (OLD CITY)"
 ],
 [
  "V368",
  6,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "J065",
  6,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "C311",
  6,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "7210",
  6,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "B333",
  6,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "L010",
  6,
  "ELAMANCHILI"
 ],
 [
  "0553",
  6,
  "SANKHAVARAM (PRATHIPADU)"
 ],
 [
  "V212",
  6,
  "L.KOTA (S.KOTA)"
 ],
 [
  "4628",
  6,
  "KARAPA"
 ],
 [
  "1210",
  6,
  "MAHARANIPETA (WALTAIR)"
 ],
 [
  "3832",
  6,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "B125",
  6,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "8856",
  6,
  "JNPC-PARAWADA"
 ],
 [
  "1259",
  6,
  "GANGAVARAM-VSKP (MALKAPURAM)"
 ],
 [
  "8017",
  6,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "J325",
  6,
  "PONDURU (ETCHERLA)"
 ],
 [
  "0954",
  6,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "T306",
  6,
  "TEKKALI"
 ],
 [
  "V218",
  6,
  "L.KOTA (S.KOTA)"
 ],
 [
  "A700",
  6,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "I402",
  6,
  "ETCHERLA"
 ],
 [
  "1162",
  6,
  "GANAPAVARAM (PEDATADEPALLI)"
 ],
 [
  "0841",
  6,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "T006",
  6,
  "DEVARAPALLI (CHODAVARAM)"
 ],
 [
  "0352",
  6,
  "KONTHAMURU (RAJAMAHENDRAVARAM)"
 ],
 [
  "P115",
  6,
  "PALAKONDA"
 ],
 [
  "S674",
  6,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "2606",
  6,
  "DWARAPUDI (MANDAPETA)"
 ],
 [
  "I414",
  6,
  "ETCHERLA"
 ],
 [
  "G539",
  6,
  "NELLIMARLA"
 ],
 [
  "B900",
  6,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "V403",
  6,
  "S.KOTA"
 ],
 [
  "J438",
  6,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "J148",
  6,
  "SARUBUJJILI (AMADALAVALASA)"
 ],
 [
  "0262",
  6,
  "SOMPETA"
 ],
 [
  "2318",
  6,
  "DENDULURU"
 ],
 [
  "0866",
  6,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "M029",
  6,
  "KOMMADI (MADHURAWADA)"
 ],
 [
  "A254",
  6,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "V450",
  6,
  "S.KOTA"
 ],
 [
  "5126",
  6,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "D110",
  6,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "2283",
  6,
  "SUJATHANAGAR (PENDURTHI)"
 ],
 [
  "J135",
  6,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "B393",
  6,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "G132",
  6,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "C306",
  6,
  "GAJAPATHINAGARAM"
 ],
 [
  "G542",
  6,
  "NELLIMARLA"
 ],
 [
  "H855",
  6,
  "NATHAVARAM"
 ],
 [
  "C331",
  6,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "0697",
  6,
  "MANDASA (PALASA)"
 ],
 [
  "K827",
  6,
  "KOTABOMMALI"
 ],
 [
  "G414",
  6,
  "NELLIMARLA"
 ],
 [
  "4820",
  6,
  "TALLAREVU (KARAPA)"
 ],
 [
  "3018",
  6,
  "TETALI (TANUKU)"
 ],
 [
  "P024",
  6,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "V117",
  6,
  "VEPADA (S.KOTA)"
 ],
 [
  "R008",
  6,
  "MADUGULA"
 ],
 [
  "S304",
  6,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "I138",
  6,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "K057",
  6,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "MM15",
  6,
  "MERAKAMUDIDAM (CHIPURUPALLI)"
 ],
 [
  "N302",
  6,
  "NARASANNAPETA"
 ],
 [
  "N047",
  6,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "8811",
  6,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "M127",
  6,
  "BODDAM (RAJAM)"
 ],
 [
  "0278",
  6,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "M120",
  6,
  "BODDAM (RAJAM)"
 ],
 [
  "8137",
  6,
  "NELLIPAKA (CHINTOOR)"
 ],
 [
  "0956",
  6,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "B237",
  6,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "3124",
  6,
  "SITARAMAPURAM (NARSAPURAM)"
 ],
 [
  "0793",
  6,
  "MANDASA (PALASA)"
 ],
 [
  "G118",
  6,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "G110",
  6,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "S112",
  6,
  "TERLAM (BADANGI)"
 ],
 [
  "S220",
  6,
  "GARA (SRIKAKULAM)"
 ],
 [
  "A124",
  6,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "P319",
  6,
  "SEETAMPETA (PALAKONDA)"
 ],
 [
  "0727",
  6,
  "PALASA"
 ],
 [
  "I357",
  6,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "2164",
  6,
  "SIMHACHALAM (GOPALAPATNAM)"
 ],
 [
  "7513",
  6,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "S336",
  6,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "G005",
  6,
  "DEVARAPALLI (CHODAVARAM)"
 ],
 [
  "V320",
  6,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "C340",
  6,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "C200",
  6,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "0292",
  6,
  "KOTHAPETA"
 ],
 [
  "0079",
  6,
  "SOMPETA"
 ],
 [
  "V219",
  6,
  "L.KOTA (S.KOTA)"
 ],
 [
  "2715",
  6,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "B070",
  6,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "C602",
  6,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "4621",
  6,
  "KARAPA"
 ],
 [
  "S612",
  6,
  "PACHIPENTA (SALURU)"
 ],
 [
  "B050",
  6,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "K408",
  6,
  "KURUPAM (KURUPAM ITDA)"
 ],
 [
  "S273",
  6,
  "GARA (SRIKAKULAM)"
 ],
 [
  "P210",
  6,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "B035",
  6,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "0228",
  6,
  "KAVITI (SOMPETA)"
 ],
 [
  "T325",
  6,
  "TEKKALI"
 ],
 [
  "V348",
  6,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "4053",
  6,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "C003",
  6,
  "DEVARAPALLI (CHODAVARAM)"
 ],
 [
  "J059",
  6,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "I901",
  6,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "I522",
  6,
  "ETCHERLA"
 ],
 [
  "0670",
  6,
  "SAKHINETIPALLI (RAZOLE)"
 ],
 [
  "GV10",
  6,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "3344",
  6,
  "SABBAVARAM-D2 (SABBAVARAM)"
 ],
 [
  "3361",
  6,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "V024",
  6,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "7028",
  6,
  "M NAGULAPALLI (BHIMADOLU)"
 ],
 [
  "C652",
  6,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "S761",
  6,
  "SALURU"
 ],
 [
  "I331",
  6,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "G406",
  6,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "G740",
  6,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "V510",
  6,
  "JAMI (S.KOTA)"
 ],
 [
  "P218",
  6,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "T344",
  6,
  "TEKKALI"
 ],
 [
  "0144",
  6,
  "PENTAPADU (TADEPALLIGUDEM)"
 ],
 [
  "C339",
  6,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "H813",
  6,
  "NATHAVARAM"
 ],
 [
  "V346",
  6,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "MM20",
  6,
  "MERAKAMUDIDAM (CHIPURUPALLI)"
 ],
 [
  "J076",
  6,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "V116",
  6,
  "VEPADA (S.KOTA)"
 ],
 [
  "E545",
  6,
  "CHINTAPALLI"
 ],
 [
  "2713",
  6,
  "ACHANTA"
 ],
 [
  "2235",
  6,
  "MUNAGAPAKA (KOTTURU)"
 ],
 [
  "I248",
  6,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "C650",
  6,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "I339",
  6,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "3100",
  6,
  "NARSAPURAM"
 ],
 [
  "G016",
  6,
  "ANANDAPURAM"
 ],
 [
  "G722",
  6,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "CH24",
  6,
  "CHIPURUPALLI"
 ],
 [
  "G361",
  6,
  "GURLA (NELLIMARLA)"
 ],
 [
  "0148",
  6,
  "KAVITI (SOMPETA)"
 ],
 [
  "R109",
  6,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "H807",
  6,
  "NATHAVARAM"
 ],
 [
  "N037",
  6,
  "SANTAKAVITI (RAJAM)"
 ],
 [
  "8853",
  6,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "0166",
  6,
  "RANGAMPETA (ANAPARTHY)"
 ],
 [
  "N016",
  6,
  "NARASANNAPETA"
 ],
 [
  "I530",
  6,
  "ETCHERLA"
 ],
 [
  "P524",
  6,
  "PATHAPATNAM"
 ],
 [
  "S138",
  6,
  "TERLAM (BADANGI)"
 ],
 [
  "V335",
  6,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "7009",
  6,
  "ATTILI (TANUKU)"
 ],
 [
  "V519",
  6,
  "JAMI (S.KOTA)"
 ],
 [
  "J125",
  6,
  "SARUBUJJILI (AMADALAVALASA)"
 ],
 [
  "K720",
  6,
  "KOTABOMMALI"
 ],
 [
  "B246",
  6,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "V102",
  6,
  "VEPADA (S.KOTA)"
 ],
 [
  "D128",
  6,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "V317",
  6,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "0024",
  6,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "C128",
  6,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "0740",
  6,
  "UNDI (AKIVEEDU)"
 ],
 [
  "0577",
  6,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "0984",
  6,
  "MANDASA (PALASA)"
 ],
 [
  "G325",
  6,
  "GURLA (NELLIMARLA)"
 ],
 [
  "G133",
  6,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "0138",
  6,
  "PENTAPADU (TADEPALLIGUDEM)"
 ],
 [
  "V436",
  6,
  "S.KOTA"
 ],
 [
  "2047",
  6,
  "BHIMADOLU"
 ],
 [
  "F625",
  6,
  "KOYYURU (CHINTAPALLI)"
 ],
 [
  "M138",
  6,
  "BODDAM (RAJAM)"
 ],
 [
  "C327",
  6,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "0472",
  6,
  "TADERU (PALAKODERU)"
 ],
 [
  "J073",
  6,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "B236",
  6,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "P576",
  6,
  "PATHAPATNAM"
 ],
 [
  "S402",
  6,
  "MAKKUVA (SALURU)"
 ],
 [
  "J333",
  6,
  "PONDURU (ETCHERLA)"
 ],
 [
  "S254",
  6,
  "GARA (SRIKAKULAM)"
 ],
 [
  "S734",
  6,
  "SALURU"
 ],
 [
  "S228",
  6,
  "BALIJIPETA (PARVATHIPURAM)"
 ],
 [
  "I206",
  6,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "1715",
  6,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "5131",
  6,
  "HOUSINGBOARDCOLONY (TADEPALLIGUDEM)"
 ],
 [
  "G540",
  6,
  "NELLIMARLA"
 ],
 [
  "R135",
  6,
  "VEERAGATTAM (PALAKONDA)"
 ],
 [
  "0908",
  6,
  "ASR NAGAR (BHIMAVARAM)"
 ],
 [
  "J099",
  6,
  "AMADALAVALASA"
 ],
 [
  "P013",
  6,
  "BOBBILI"
 ],
 [
  "S903",
  6,
  "SALURU"
 ],
 [
  "2186",
  6,
  "GOPALAPATNAM"
 ],
 [
  "8409",
  6,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "D038",
  6,
  "PARVATHIPURAM"
 ],
 [
  "I416",
  6,
  "ETCHERLA"
 ],
 [
  "C202",
  6,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "6203",
  6,
  "MORAMPUDI"
 ],
 [
  "3013",
  6,
  "TETALI (TANUKU)"
 ],
 [
  "6655",
  6,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "A014",
  6,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "A127",
  6,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "9254",
  6,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "9305",
  6,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "N127",
  6,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "G528",
  5,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "3038",
  5,
  "T-NARSAPURAM (KAMAVARAPUKOTA)"
 ],
 [
  "G207",
  5,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "B020",
  5,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "0196",
  5,
  "JAGGAMPETA"
 ],
 [
  "I110",
  5,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "4025",
  5,
  "RANGAPURAM (PEDAVEGI)"
 ],
 [
  "G219",
  5,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "J120",
  5,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "J144",
  5,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "0951",
  5,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "G232",
  5,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "0822",
  5,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "G527",
  5,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "1327",
  5,
  "VIDYUTHSAKHA (OLD CITY)"
 ],
 [
  "V513",
  5,
  "JAMI (S.KOTA)"
 ],
 [
  "7707",
  5,
  "AGANAMPUDI"
 ],
 [
  "B336",
  5,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "B222",
  5,
  "BHAMINI (PALAKONDA)"
 ],
 [
  "0454",
  5,
  "TADUVAI (JANGAREDDYGUDEM)"
 ],
 [
  "1775",
  5,
  "JANGAREDDYGUDEM"
 ],
 [
  "V321",
  5,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "K033",
  5,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "0085",
  5,
  "KAVITI (SOMPETA)"
 ],
 [
  "4809",
  5,
  "TALLAREVU (KARAPA)"
 ],
 [
  "7123",
  5,
  "UNGUTURU"
 ],
 [
  "0388",
  5,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "J220",
  5,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "J422",
  5,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "J022",
  5,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "0942",
  5,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "0656",
  5,
  "SAKHINETIPALLI (RAZOLE)"
 ],
 [
  "S136",
  5,
  "TERLAM (BADANGI)"
 ],
 [
  "J403",
  5,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "0395",
  5,
  "KANCHILI (SOMPETA)"
 ],
 [
  "I909",
  5,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "S902",
  5,
  "SALURU"
 ],
 [
  "B043",
  5,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "I235",
  5,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "8855",
  5,
  "JNPC-PARAWADA"
 ],
 [
  "I191",
  5,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "L015",
  5,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "G344",
  5,
  "GURLA (NELLIMARLA)"
 ],
 [
  "V332",
  5,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "I209",
  5,
  "RANASTHALAM"
 ],
 [
  "J018",
  5,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "K405",
  5,
  "KURUPAM (KURUPAM ITDA)"
 ],
 [
  "J106",
  5,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "M114",
  5,
  "BODDAM (RAJAM)"
 ],
 [
  "N035",
  5,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "J344",
  5,
  "PONDURU (ETCHERLA)"
 ],
 [
  "0848",
  5,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "J032",
  5,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "6624",
  5,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "6207",
  5,
  "MORAMPUDI"
 ],
 [
  "0376",
  5,
  "KAVITI (SOMPETA)"
 ],
 [
  "0359",
  5,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "I335",
  5,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "A900",
  5,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "S671",
  5,
  "PACHIPENTA (SALURU)"
 ],
 [
  "6209",
  5,
  "MORAMPUDI"
 ],
 [
  "1219",
  5,
  "ALLIPURAM (OLD CITY)"
 ],
 [
  "P257",
  5,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "S085",
  5,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "4826",
  5,
  "TALLAREVU (KARAPA)"
 ],
 [
  "B135",
  5,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "S269",
  5,
  "GARA (SRIKAKULAM)"
 ],
 [
  "P205",
  5,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "C152",
  5,
  "DATTI RAJERU (GAJAPATHINAGARAM)"
 ],
 [
  "G019",
  5,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "V431",
  5,
  "S.KOTA"
 ],
 [
  "MM10",
  5,
  "MERAKAMUDIDAM (CHIPURUPALLI)"
 ],
 [
  "H002",
  5,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "GV17",
  5,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "N056",
  5,
  "SANTAKAVITI (RAJAM)"
 ],
 [
  "K740",
  5,
  "KOTABOMMALI"
 ],
 [
  "0651",
  5,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "J013",
  5,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "G420",
  5,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "6120",
  5,
  "BHAGYALAKSHMIPETA (TADEPALLIGUDEM)"
 ],
 [
  "S623",
  5,
  "PACHIPENTA (SALURU)"
 ],
 [
  "0068",
  5,
  "KAVITI (SOMPETA)"
 ],
 [
  "4828",
  5,
  "TALLAREVU (KARAPA)"
 ],
 [
  "B351",
  5,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "S088",
  5,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "A029",
  5,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "1304",
  5,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "0693",
  5,
  "SOMPETA"
 ],
 [
  "4631",
  5,
  "KARAPA"
 ],
 [
  "1058",
  5,
  "RAMPACHODAVARAM"
 ],
 [
  "J072",
  5,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "0780",
  5,
  "PALASA"
 ],
 [
  "I105",
  5,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "G139",
  5,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "V333",
  5,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "I198",
  5,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "I116",
  5,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "I230",
  5,
  "RANASTHALAM"
 ],
 [
  "3381",
  5,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "J157",
  5,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "4525",
  5,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "7320",
  5,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "A239",
  5,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "GV06",
  5,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "4819",
  5,
  "TALLAREVU (KARAPA)"
 ],
 [
  "J077",
  5,
  "AMADALAVALASA"
 ],
 [
  "P209",
  5,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "S287",
  5,
  "GARA (SRIKAKULAM)"
 ],
 [
  "R136",
  5,
  "VEERAGATTAM (PALAKONDA)"
 ],
 [
  "CH26",
  5,
  "CHIPURUPALLI"
 ],
 [
  "S122",
  5,
  "TERLAM (BADANGI)"
 ],
 [
  "V445",
  5,
  "S.KOTA"
 ],
 [
  "S627",
  5,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "1755",
  5,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "S667",
  5,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "V105",
  5,
  "VEPADA (S.KOTA)"
 ],
 [
  "5019",
  5,
  "PERAVALI (NIDADAVOLE)"
 ],
 [
  "G329",
  5,
  "RAVIKAMATAM (MADUGULA)"
 ],
 [
  "V101",
  5,
  "VEPADA (S.KOTA)"
 ],
 [
  "I425",
  5,
  "ETCHERLA"
 ],
 [
  "MM47",
  5,
  "MERAKAMUDIDAM (CHIPURUPALLI)"
 ],
 [
  "7017",
  5,
  "ATTILI (TANUKU)"
 ],
 [
  "A253",
  5,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "P042",
  5,
  "ELAMANCHILI"
 ],
 [
  "C105",
  5,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "MM07",
  5,
  "MERAKAMUDIDAM (CHIPURUPALLI)"
 ],
 [
  "0798",
  5,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "V110",
  5,
  "VEPADA (S.KOTA)"
 ],
 [
  "I507",
  5,
  "ETCHERLA"
 ],
 [
  "R012",
  5,
  "ELAMANCHILI"
 ],
 [
  "N026",
  5,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "D009",
  5,
  "BHEEMILI"
 ],
 [
  "G308",
  5,
  "GURLA (NELLIMARLA)"
 ],
 [
  "E500",
  5,
  "SOMPETA"
 ],
 [
  "C110",
  5,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "I236",
  5,
  "RANASTHALAM"
 ],
 [
  "S673",
  5,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "N109",
  5,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "B124",
  5,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "S426",
  5,
  "MAKKUVA (SALURU)"
 ],
 [
  "0579",
  5,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "3364",
  5,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "J317",
  5,
  "PONDURU (ETCHERLA)"
 ],
 [
  "I917",
  5,
  "NARSIPATNAM"
 ],
 [
  "C005",
  5,
  "BUTCHAYYAPETA (MADUGULA)"
 ],
 [
  "J745",
  5,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "K760",
  5,
  "KOTABOMMALI"
 ],
 [
  "P142",
  5,
  "PALAKONDA"
 ],
 [
  "T321",
  5,
  "TEKKALI"
 ],
 [
  "GV01",
  5,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "0671",
  5,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "S303",
  5,
  "RAMBADRAPURAM (BADANGI)"
 ],
 [
  "S313",
  5,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "0271",
  5,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "N106",
  5,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "2332",
  5,
  "DENDULURU"
 ],
 [
  "P578",
  5,
  "PATHAPATNAM"
 ],
 [
  "N135",
  5,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "N021",
  5,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "S145",
  5,
  "TERLAM (BADANGI)"
 ],
 [
  "N156",
  5,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "J429",
  5,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "J799",
  5,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "S126",
  5,
  "TERLAM (BADANGI)"
 ],
 [
  "G131",
  5,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "B287",
  5,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "J308",
  5,
  "PONDURU (ETCHERLA)"
 ],
 [
  "M407",
  5,
  "MELIAPUTTI (PATHAPATNAM)"
 ],
 [
  "J052",
  5,
  "AMADALAVALASA"
 ],
 [
  "0458",
  5,
  "TADUVAI (JANGAREDDYGUDEM)"
 ],
 [
  "V415",
  5,
  "S.KOTA"
 ],
 [
  "1061",
  5,
  "RAMPACHODAVARAM"
 ],
 [
  "2263",
  5,
  "SUJATHANAGAR (PENDURTHI)"
 ],
 [
  "G718",
  5,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "I512",
  5,
  "ETCHERLA"
 ],
 [
  "J061",
  5,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "2255",
  5,
  "SUJATHANAGAR (PENDURTHI)"
 ],
 [
  "P233",
  5,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "5534",
  5,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "0707",
  5,
  "KATRENIKONA (MUMMIDIVARAM)"
 ],
 [
  "V523",
  5,
  "JAMI (S.KOTA)"
 ],
 [
  "I520",
  5,
  "ETCHERLA"
 ],
 [
  "R241",
  5,
  "VANGARA (RAJAM)"
 ],
 [
  "N019",
  5,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "0357",
  5,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "A224",
  5,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "8010",
  5,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "8120",
  5,
  "NELLIPAKA (CHINTOOR)"
 ],
 [
  "V123",
  5,
  "VEPADA (S.KOTA)"
 ],
 [
  "E502",
  5,
  "CHINTAPALLI"
 ],
 [
  "F648",
  5,
  "KOYYURU (CHINTAPALLI)"
 ],
 [
  "0907",
  5,
  "ASR NAGAR (BHIMAVARAM)"
 ],
 [
  "V503",
  5,
  "JAMI (S.KOTA)"
 ],
 [
  "0770",
  5,
  "UPPALAGUPTAM (MUMMIDIVARAM)"
 ],
 [
  "T375",
  5,
  "TEKKALI"
 ],
 [
  "T238",
  5,
  "TEKKALI"
 ],
 [
  "J141",
  5,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "7110",
  5,
  "BHIMADOLU"
 ],
 [
  "2226",
  5,
  "POOLAPALLI (PALAKOL)"
 ],
 [
  "J442",
  5,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "MM08",
  5,
  "MERAKAMUDIDAM (CHIPURUPALLI)"
 ],
 [
  "3836",
  5,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "0909",
  5,
  "ASR NAGAR (BHIMAVARAM)"
 ],
 [
  "I427",
  5,
  "ETCHERLA"
 ],
 [
  "I949",
  5,
  "NARSIPATNAM"
 ],
 [
  "D073",
  5,
  "G.MADUGULA (CHINTAPALLI)"
 ],
 [
  "3213",
  5,
  "RAJAVOMMANGI (RAMPACHODAVARAM RURAL)"
 ],
 [
  "F602",
  5,
  "KOYYURU (CHINTAPALLI)"
 ],
 [
  "0276",
  5,
  "BUTTAIGUDEM (POLAVARAM)"
 ],
 [
  "S312",
  5,
  "RAMBADRAPURAM (BADANGI)"
 ],
 [
  "A117",
  5,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "G606",
  5,
  "P.N.COLONY (SRIKAKULAM)"
 ],
 [
  "K825",
  5,
  "KOTABOMMALI"
 ],
 [
  "E562",
  5,
  "CHINTAPALLI"
 ],
 [
  "J155",
  5,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "I001",
  5,
  "BUTCHAYYAPETA (MADUGULA)"
 ],
 [
  "S911",
  5,
  "SALURU"
 ],
 [
  "9329",
  5,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "S012",
  5,
  "ARAKU"
 ],
 [
  "S036",
  5,
  "HUKUMPETA (PADERU)"
 ],
 [
  "6617",
  5,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "B042",
  5,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "9102",
  5,
  "CHINTOOR"
 ],
 [
  "9101",
  5,
  "CHINTOOR"
 ],
 [
  "9340",
  5,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "I268",
  5,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "S908",
  5,
  "SALURU"
 ],
 [
  "D200",
  4,
  "KOTABOMMALI"
 ],
 [
  "I175",
  4,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "N139",
  4,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "G319",
  4,
  "GURLA (NELLIMARLA)"
 ],
 [
  "G502",
  4,
  "SATYAVARAM (PAYAKARAO PETA)"
 ],
 [
  "E002",
  4,
  "KASIBUGGA (PALASA)"
 ],
 [
  "2139",
  4,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "P038",
  4,
  "ELAMANCHILI"
 ],
 [
  "1451",
  4,
  "KANCHARAPALEM"
 ],
 [
  "B704",
  4,
  "PEDAWALTAIR (WALTAIR)"
 ],
 [
  "8815",
  4,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "I430",
  4,
  "ETCHERLA"
 ],
 [
  "0541",
  4,
  "THONDANGI (TUNI)"
 ],
 [
  "0957",
  4,
  "HAMSAVARAM (TUNI)"
 ],
 [
  "V418",
  4,
  "S.KOTA"
 ],
 [
  "D277",
  4,
  "MENTADA (GAJAPATHINAGARAM)"
 ],
 [
  "V433",
  4,
  "S.KOTA"
 ],
 [
  "0378",
  4,
  "JEELUGUMILLI"
 ],
 [
  "0843",
  4,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "4620",
  4,
  "KARAPA"
 ],
 [
  "K045",
  4,
  "ELAMANCHILI"
 ],
 [
  "7505",
  4,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "1273",
  4,
  "PEDAGANTYADA (MALKAPURAM)"
 ],
 [
  "P239",
  4,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "S293",
  4,
  "GARA (SRIKAKULAM)"
 ],
 [
  "0543",
  4,
  "THONDANGI (TUNI)"
 ],
 [
  "0855",
  4,
  "SANKHAVARAM (PRATHIPADU)"
 ],
 [
  "C113",
  4,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "P128",
  4,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "I103",
  4,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "K065",
  4,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "2240",
  4,
  "KAJULURU (KARAPA)"
 ],
 [
  "0923",
  4,
  "KAVITI (SOMPETA)"
 ],
 [
  "1100",
  4,
  "PALAKOLE (PALAKOL)"
 ],
 [
  "1161",
  4,
  "GANAPAVARAM (PEDATADEPALLI)"
 ],
 [
  "I275",
  4,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "N043",
  4,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "C329",
  4,
  "GARUGUBILLI (PARVATHIPURAM)"
 ],
 [
  "S349",
  4,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "N129",
  4,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "P577",
  4,
  "PATHAPATNAM"
 ],
 [
  "I501",
  4,
  "ETCHERLA"
 ],
 [
  "GV43",
  4,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "M134",
  4,
  "BODDAM (RAJAM)"
 ],
 [
  "T384",
  4,
  "TEKKALI"
 ],
 [
  "H859",
  4,
  "NATHAVARAM"
 ],
 [
  "V213",
  4,
  "L.KOTA (S.KOTA)"
 ],
 [
  "V207",
  4,
  "L.KOTA (S.KOTA)"
 ],
 [
  "C352",
  4,
  "GAJAPATHINAGARAM"
 ],
 [
  "B360",
  4,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "J007",
  4,
  "ELAMANCHILI"
 ],
 [
  "H819",
  4,
  "NATHAVARAM"
 ],
 [
  "0917",
  4,
  "PRAKASHAM CHOWK (BHIMAVARAM)"
 ],
 [
  "S625",
  4,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "V532",
  4,
  "JAMI (S.KOTA)"
 ],
 [
  "0826",
  4,
  "U.KOTHAPALLI (PITHAPURAM)"
 ],
 [
  "5537",
  4,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "S433",
  4,
  "MAKKUVA (SALURU)"
 ],
 [
  "I303",
  4,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "I508",
  4,
  "ETCHERLA"
 ],
 [
  "I334",
  4,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "2120",
  4,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "B182",
  4,
  "BHOGAPURAM"
 ],
 [
  "J214",
  4,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "K043",
  4,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "B123",
  4,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "2183",
  4,
  "GOPALAPATNAM"
 ],
 [
  "GV22",
  4,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "J040",
  4,
  "AMADALAVALASA"
 ],
 [
  "P201",
  4,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "I173",
  4,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "1331",
  4,
  "VIDYUTHSAKHA (OLD CITY)"
 ],
 [
  "0354",
  4,
  "MANDAPETA"
 ],
 [
  "2264",
  4,
  "PENDURTHI"
 ],
 [
  "B041",
  4,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "2244",
  4,
  "KAJULURU (KARAPA)"
 ],
 [
  "B100",
  4,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "8838",
  4,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "0229",
  4,
  "RAGHAVAPURAM (CHINTALAPUDI)"
 ],
 [
  "I502",
  4,
  "ETCHERLA"
 ],
 [
  "C129",
  4,
  "DATTI RAJERU (GAJAPATHINAGARAM)"
 ],
 [
  "H857",
  4,
  "NATHAVARAM"
 ],
 [
  "V214",
  4,
  "L.KOTA (S.KOTA)"
 ],
 [
  "S329",
  4,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "M136",
  4,
  "BODDAM (RAJAM)"
 ],
 [
  "I204",
  4,
  "RANASTHALAM"
 ],
 [
  "J750",
  4,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "J121",
  4,
  "SARUBUJJILI (AMADALAVALASA)"
 ],
 [
  "5528",
  4,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "J227",
  4,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "0791",
  4,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "S011",
  4,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "4625",
  4,
  "KARAPA"
 ],
 [
  "7508",
  4,
  "VAKALAPUDI (SARPAVARAM)"
 ],
 [
  "J028",
  4,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "0350",
  4,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "P122",
  4,
  "PALAKONDA"
 ],
 [
  "G303",
  4,
  "RAVIKAMATAM (MADUGULA)"
 ],
 [
  "0946",
  4,
  "MANDASA (PALASA)"
 ],
 [
  "K046",
  4,
  "ELAMANCHILI"
 ],
 [
  "V516",
  4,
  "JAMI (S.KOTA)"
 ],
 [
  "G311",
  4,
  "RAVIKAMATAM (MADUGULA)"
 ],
 [
  "B198",
  4,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "H830",
  4,
  "NATHAVARAM"
 ],
 [
  "M117",
  4,
  "BODDAM (RAJAM)"
 ],
 [
  "0949",
  4,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "2234",
  4,
  "KAJULURU (KARAPA)"
 ],
 [
  "0319",
  4,
  "DENKADA (BHOGAPURAM)"
 ],
 [
  "C354",
  4,
  "GAJAPATHINAGARAM"
 ],
 [
  "M109",
  4,
  "BODDAM (RAJAM)"
 ],
 [
  "J036",
  4,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "K717",
  4,
  "KOTABOMMALI"
 ],
 [
  "CH28",
  4,
  "CHIPURUPALLI"
 ],
 [
  "S123",
  4,
  "TERLAM (BADANGI)"
 ],
 [
  "Y004",
  4,
  "ANANDAPURAM"
 ],
 [
  "S326",
  4,
  "RAMBADRAPURAM (BADANGI)"
 ],
 [
  "B229",
  4,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "J402",
  4,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "G704",
  4,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "B340",
  4,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "GU03",
  4,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "7029",
  4,
  "M NAGULAPALLI (BHIMADOLU)"
 ],
 [
  "B284",
  4,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "0032",
  4,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "0552",
  4,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "I145",
  4,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "B027",
  4,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "A228",
  4,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "3006",
  4,
  "TETALI (TANUKU)"
 ],
 [
  "V413",
  4,
  "S.KOTA"
 ],
 [
  "I277",
  4,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "S741",
  4,
  "SALURU"
 ],
 [
  "I364",
  4,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "I279",
  4,
  "RANASTHALAM"
 ],
 [
  "G727",
  4,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "1217",
  4,
  "MAHARANIPETA (WALTAIR)"
 ],
 [
  "0345",
  4,
  "KAMAVARAPUKOTA"
 ],
 [
  "J057",
  4,
  "AMADALAVALASA"
 ],
 [
  "S232",
  4,
  "GARA (SRIKAKULAM)"
 ],
 [
  "A211",
  4,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "C316",
  4,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "I311",
  4,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "CH29",
  4,
  "CHIPURUPALLI"
 ],
 [
  "C142",
  4,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "S333",
  4,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "K028",
  4,
  "BUCHCHANNAKONERU (VIZIANAGARAM)"
 ],
 [
  "R022",
  4,
  "ELAMANCHILI"
 ],
 [
  "J162",
  4,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "4405",
  4,
  "MOGALTURU (NARSAPURAM)"
 ],
 [
  "R113",
  4,
  "VEERAGATTAM (PALAKONDA)"
 ],
 [
  "H801",
  4,
  "NATHAVARAM"
 ],
 [
  "3132",
  4,
  "KUKKUNURU (JEELUGUMILLI)"
 ],
 [
  "S661",
  4,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "I310",
  4,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "C654",
  4,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "A800",
  4,
  "TOWN KOTHA ROAD (OLD CITY)"
 ],
 [
  "I358",
  4,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "H853",
  4,
  "NATHAVARAM"
 ],
 [
  "G105",
  4,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "B024",
  4,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "S660",
  4,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "Y002",
  4,
  "CHITTIVALASA (BHEEMILI)"
 ],
 [
  "B240",
  4,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "B055",
  4,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "F601",
  4,
  "KOYYURU (CHINTAPALLI)"
 ],
 [
  "D209",
  4,
  "MENTADA (GAJAPATHINAGARAM)"
 ],
 [
  "R201",
  4,
  "VANGARA (RAJAM)"
 ],
 [
  "V506",
  4,
  "JAMI (S.KOTA)"
 ],
 [
  "V307",
  4,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "P231",
  4,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "J108",
  4,
  "SARUBUJJILI (AMADALAVALASA)"
 ],
 [
  "G123",
  4,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "J164",
  4,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "A025",
  4,
  "ATCHUTHAPURAM"
 ],
 [
  "V104",
  4,
  "VEPADA (S.KOTA)"
 ],
 [
  "0251",
  4,
  "KASIBUGGA (PALASA)"
 ],
 [
  "S636",
  4,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "P149",
  4,
  "PALAKONDA"
 ],
 [
  "0455",
  4,
  "TADUVAI (JANGAREDDYGUDEM)"
 ],
 [
  "J082",
  4,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "S420",
  4,
  "MAKKUVA (SALURU)"
 ],
 [
  "V324",
  4,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "S634",
  4,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "CH21",
  4,
  "CHIPURUPALLI"
 ],
 [
  "N027",
  4,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "D230",
  4,
  "MENTADA (GAJAPATHINAGARAM)"
 ],
 [
  "I422",
  4,
  "ETCHERLA"
 ],
 [
  "0441",
  4,
  "TADERU (PALAKODERU)"
 ],
 [
  "S227",
  4,
  "BALIJIPETA (PARVATHIPURAM)"
 ],
 [
  "6640",
  4,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "2722",
  4,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "P118",
  4,
  "PALAKONDA"
 ],
 [
  "I231",
  4,
  "RANASTHALAM"
 ],
 [
  "J132",
  4,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "7704",
  4,
  "AGANAMPUDI"
 ],
 [
  "9208",
  4,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "J042",
  4,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "5011",
  4,
  "PERAVALI (NIDADAVOLE)"
 ],
 [
  "B106",
  4,
  "BHOGAPURAM"
 ],
 [
  "1123",
  4,
  "GANAPAVARAM (PEDATADEPALLI)"
 ],
 [
  "R117",
  4,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "S315",
  4,
  "GARA (SRIKAKULAM)"
 ],
 [
  "2261",
  4,
  "PENDURTHI"
 ],
 [
  "V209",
  4,
  "L.KOTA (S.KOTA)"
 ],
 [
  "7011",
  4,
  "ATTILI (TANUKU)"
 ],
 [
  "0945",
  4,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "K018",
  4,
  "VENKANNAPALEM (CHODAVARAM)"
 ],
 [
  "P107",
  4,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "R245",
  4,
  "VANGARA (RAJAM)"
 ],
 [
  "N057",
  4,
  "SANTAKAVITI (RAJAM)"
 ],
 [
  "V204",
  4,
  "L.KOTA (S.KOTA)"
 ],
 [
  "2509",
  4,
  "YEDIDA (MANDAPETA)"
 ],
 [
  "6114",
  4,
  "BHAGYALAKSHMIPETA (TADEPALLIGUDEM)"
 ],
 [
  "I403",
  4,
  "ETCHERLA"
 ],
 [
  "2810",
  4,
  "PODURU (PALAKOL)"
 ],
 [
  "H854",
  4,
  "NATHAVARAM"
 ],
 [
  "V222",
  4,
  "L.KOTA (S.KOTA)"
 ],
 [
  "C182",
  4,
  "DATTI RAJERU (GAJAPATHINAGARAM)"
 ],
 [
  "B389",
  4,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "B109",
  4,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "1256",
  4,
  "GANGAVARAM-VSKP (MALKAPURAM)"
 ],
 [
  "C010",
  4,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "P336",
  4,
  "SEETAMPETA (PALAKONDA)"
 ],
 [
  "M103",
  4,
  "BODDAM (RAJAM)"
 ],
 [
  "S316",
  4,
  "RAMBADRAPURAM (BADANGI)"
 ],
 [
  "S271",
  4,
  "GARA (SRIKAKULAM)"
 ],
 [
  "P255",
  4,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "MM36",
  4,
  "MERAKAMUDIDAM (CHIPURUPALLI)"
 ],
 [
  "GV42",
  4,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "T310",
  4,
  "TEKKALI"
 ],
 [
  "6649",
  4,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "0460",
  4,
  "KAVITI (SOMPETA)"
 ],
 [
  "J038",
  4,
  "AMADALAVALASA"
 ],
 [
  "J133",
  4,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "8124",
  4,
  "NELLIPAKA (CHINTOOR)"
 ],
 [
  "S322",
  4,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "J314",
  4,
  "PONDURU (ETCHERLA)"
 ],
 [
  "S297",
  4,
  "GARA (SRIKAKULAM)"
 ],
 [
  "7307",
  4,
  "PRAKASHAM CHOWK (BHIMAVARAM)"
 ],
 [
  "S419",
  4,
  "MAKKUVA (SALURU)"
 ],
 [
  "T183",
  4,
  "TEKKALI"
 ],
 [
  "G347",
  4,
  "GURLA (NELLIMARLA)"
 ],
 [
  "G454",
  4,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "B327",
  4,
  "GUMMALAKSHMIPURAM (KURUPAM ITDA)"
 ],
 [
  "MM32",
  4,
  "MERAKAMUDIDAM (CHIPURUPALLI)"
 ],
 [
  "3094",
  4,
  "NARSAPURAM"
 ],
 [
  "4032",
  4,
  "SABBAVARAM-D1 (SABBAVARAM)"
 ],
 [
  "0918",
  4,
  "PRAKASHAM CHOWK (BHIMAVARAM)"
 ],
 [
  "B504",
  4,
  "PEDAWALTAIR (WALTAIR)"
 ],
 [
  "1000",
  4,
  "PALAKOLE (PALAKOL)"
 ],
 [
  "C355",
  4,
  "GAJAPATHINAGARAM"
 ],
 [
  "B243",
  4,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "2610",
  4,
  "DWARAPUDI (MANDAPETA)"
 ],
 [
  "N164",
  4,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "1034",
  4,
  "NARSAPURAM"
 ],
 [
  "S244",
  4,
  "GARA (SRIKAKULAM)"
 ],
 [
  "J338",
  4,
  "PONDURU (ETCHERLA)"
 ],
 [
  "9201",
  4,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "B154",
  4,
  "BHOGAPURAM"
 ],
 [
  "K019",
  4,
  "KONDAKARLA (ATCHUTHAPURAM)"
 ],
 [
  "B245",
  4,
  "MAKAVARAPALEM (NARSIPATNAM)"
 ],
 [
  "I517",
  4,
  "ETCHERLA"
 ],
 [
  "J235",
  4,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "G410",
  4,
  "NELLIMARLA"
 ],
 [
  "8826",
  4,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "5504",
  4,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "S906",
  4,
  "SALURU"
 ],
 [
  "2126",
  4,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "8810",
  4,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "S913",
  4,
  "SALURU"
 ],
 [
  "S914",
  4,
  "SALURU"
 ],
 [
  "G602",
  4,
  "P.N.COLONY (SRIKAKULAM)"
 ],
 [
  "V353",
  4,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "G211",
  4,
  "DASANNAPETA (VIZIANAGARAM)"
 ],
 [
  "R116",
  4,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "G304",
  4,
  "GURLA (NELLIMARLA)"
 ],
 [
  "H867",
  4,
  "NATHAVARAM"
 ],
 [
  "GV38",
  4,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "M018",
  4,
  "THATITURU (BHEEMILI)"
 ],
 [
  "6313",
  4,
  "SATELLITE CITY (MORAMPUDI)"
 ],
 [
  "A259",
  4,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "1126",
  4,
  "KASIMKOTA"
 ],
 [
  "J158",
  4,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "7115",
  4,
  "UNGUTURU"
 ],
 [
  "G149",
  4,
  "G.MADUGULA (CHINTAPALLI)"
 ],
 [
  "H804",
  4,
  "NATHAVARAM"
 ],
 [
  "S015",
  4,
  "PEDABAYALU (PADERU)"
 ],
 [
  "U014",
  4,
  "HUKUMPETA (PADERU)"
 ],
 [
  "9247",
  4,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "S007",
  4,
  "HUKUMPETA (PADERU)"
 ],
 [
  "1452",
  4,
  "KANCHARAPALEM"
 ],
 [
  "9339",
  4,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "9244",
  4,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "2181",
  4,
  "GOPALAPATNAM"
 ],
 [
  "9246",
  4,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "D054",
  4,
  "PADERU"
 ],
 [
  "E665",
  4,
  "CHINTAPALLI"
 ],
 [
  "0450",
  4,
  "TADERU (PALAKODERU)"
 ],
 [
  "9221",
  4,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "G170",
  4,
  "HUKUMPETA (PADERU)"
 ],
 [
  "6303",
  4,
  "SATELLITE CITY (MORAMPUDI)"
 ],
 [
  "9343",
  4,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "4515",
  4,
  "RAMANAYYAPETA (SARPAVARAM)"
 ],
 [
  "R111",
  3,
  "AYYANNAPETA (VIZIANAGARAM)"
 ],
 [
  "G205",
  3,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "G234",
  3,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "G214",
  3,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "A240",
  3,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "G230",
  3,
  "NAKKAPALLI (PAYAKARAO PETA)"
 ],
 [
  "7314",
  3,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "6024",
  3,
  "DWARAKA TIRUMALA (BHIMADOLU)"
 ],
 [
  "I133",
  3,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "J310",
  3,
  "PONDURU (ETCHERLA)"
 ],
 [
  "S265",
  3,
  "GARA (SRIKAKULAM)"
 ],
 [
  "B150",
  3,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "2306",
  3,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "0896",
  3,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "S300",
  3,
  "GARA (SRIKAKULAM)"
 ],
 [
  "J353",
  3,
  "PONDURU (ETCHERLA)"
 ],
 [
  "0053",
  3,
  "SOMPETA"
 ],
 [
  "7204",
  3,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "7206",
  3,
  "VETLAPALEM (SAMALKOTA)"
 ],
 [
  "B804",
  3,
  "PEDAWALTAIR (WALTAIR)"
 ],
 [
  "G711",
  3,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "1712",
  3,
  "NSTL (KANCHARAPALEM)"
 ],
 [
  "V311",
  3,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "J343",
  3,
  "PONDURU (ETCHERLA)"
 ],
 [
  "C314",
  3,
  "KOTAURATLA (NATHAVARAM)"
 ],
 [
  "4028",
  3,
  "LINGAPALEM (PEDAVEGI)"
 ],
 [
  "1807",
  3,
  "NIDAMARRU (UNGUTURU)"
 ],
 [
  "2165",
  3,
  "VEPAGUNTA (PENDURTHI)"
 ],
 [
  "N029",
  3,
  "SANTAKAVITI (RAJAM)"
 ],
 [
  "2256",
  3,
  "SUJATHANAGAR (PENDURTHI)"
 ],
 [
  "I181",
  3,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "C179",
  3,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "7140",
  3,
  "UNGUTURU"
 ],
 [
  "I351",
  3,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "C900",
  3,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "8818",
  3,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "I312",
  3,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "S118",
  3,
  "TERLAM (BADANGI)"
 ],
 [
  "V310",
  3,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "2286",
  3,
  "PENDURTHI"
 ],
 [
  "I281",
  3,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "D109",
  3,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "0382",
  3,
  "JEELUGUMILLI"
 ],
 [
  "J313",
  3,
  "PONDURU (ETCHERLA)"
 ],
 [
  "3016",
  3,
  "TETALI (TANUKU)"
 ],
 [
  "V136",
  3,
  "VEPADA (S.KOTA)"
 ],
 [
  "0GMR",
  3,
  "GAJUWAKA"
 ],
 [
  "P377",
  3,
  "SEETAMPETA (PALAKONDA)"
 ],
 [
  "I307",
  3,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "S076",
  3,
  "RAGOLU (SRIKAKULAM)"
 ],
 [
  "0059",
  3,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "4834",
  3,
  "TALLAREVU (KARAPA)"
 ],
 [
  "I308",
  3,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "J224",
  3,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "4027",
  3,
  "RANGAPURAM (PEDAVEGI)"
 ],
 [
  "C012",
  3,
  "ELAMANCHILI"
 ],
 [
  "S237",
  3,
  "BALIJIPETA (PARVATHIPURAM)"
 ],
 [
  "1301",
  3,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "K829",
  3,
  "KOTABOMMALI"
 ],
 [
  "0456",
  3,
  "TADUVAI (JANGAREDDYGUDEM)"
 ],
 [
  "V536",
  3,
  "JAMI (S.KOTA)"
 ],
 [
  "F651",
  3,
  "KOYYURU (CHINTAPALLI)"
 ],
 [
  "C386",
  3,
  "GAJAPATHINAGARAM"
 ],
 [
  "L008",
  3,
  "BUTCHAYYAPETA (MADUGULA)"
 ],
 [
  "I140",
  3,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "I240",
  3,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "B275",
  3,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "V406",
  3,
  "S.KOTA"
 ],
 [
  "G338",
  3,
  "GURLA (NELLIMARLA)"
 ],
 [
  "0289",
  3,
  "VEERAVASARAM (PALAKODERU)"
 ],
 [
  "M406",
  3,
  "MELIAPUTTI (PATHAPATNAM)"
 ],
 [
  "6021",
  3,
  "IRAGAVARAM (TANUKU)"
 ],
 [
  "I262",
  3,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "M457",
  3,
  "MELIAPUTTI (PATHAPATNAM)"
 ],
 [
  "I365",
  3,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "0392",
  3,
  "PALASA"
 ],
 [
  "C381",
  3,
  "GAJAPATHINAGARAM"
 ],
 [
  "J454",
  3,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "I263",
  3,
  "RANASTHALAM"
 ],
 [
  "4100",
  3,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "G317",
  3,
  "GURLA (NELLIMARLA)"
 ],
 [
  "7108",
  3,
  "UNGUTURU"
 ],
 [
  "S224",
  3,
  "GARA (SRIKAKULAM)"
 ],
 [
  "R137",
  3,
  "VEERAGATTAM (PALAKONDA)"
 ],
 [
  "B132",
  3,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "J232",
  3,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "0277",
  3,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "I948",
  3,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "J070",
  3,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "D056",
  3,
  "PARVATHIPURAM"
 ],
 [
  "I280",
  3,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "S723",
  3,
  "SALURU"
 ],
 [
  "B116",
  3,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "C114",
  3,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "7311",
  3,
  "DIVILI (SAMALKOTA)"
 ],
 [
  "G422",
  3,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "B380",
  3,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "5511",
  3,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "J430",
  3,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "R014",
  3,
  "ANANDAPURAM"
 ],
 [
  "D220",
  3,
  "KOTABOMMALI"
 ],
 [
  "J202",
  3,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "N149",
  3,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "I192",
  3,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "V119",
  3,
  "VEPADA (S.KOTA)"
 ],
 [
  "0572",
  3,
  "P.GANNAVARAM (RAZOLE)"
 ],
 [
  "I434",
  3,
  "ETCHERLA"
 ],
 [
  "J105",
  3,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "A255",
  3,
  "GANTYADA (NELLIMARLA)"
 ],
 [
  "S279",
  3,
  "GARA (SRIKAKULAM)"
 ],
 [
  "G411",
  3,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "5509",
  3,
  "THALLAPALEM (KASIMKOTA)"
 ],
 [
  "B045",
  3,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "0689",
  3,
  "KANCHILI (SOMPETA)"
 ],
 [
  "P211",
  3,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "2704",
  3,
  "ACHANTA"
 ],
 [
  "0290",
  3,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "K763",
  3,
  "KOTABOMMALI"
 ],
 [
  "R238",
  3,
  "VANGARA (RAJAM)"
 ],
 [
  "0348",
  3,
  "KAMAVARAPUKOTA"
 ],
 [
  "9225",
  3,
  "VEERAVASARAM (PALAKODERU)"
 ],
 [
  "V401",
  3,
  "S.KOTA"
 ],
 [
  "P244",
  3,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "C166",
  3,
  "DATTI RAJERU (GAJAPATHINAGARAM)"
 ],
 [
  "D105",
  3,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "2130",
  3,
  "DRAKSHARAMAM (RAMACHANDRAPURAM)"
 ],
 [
  "P106",
  3,
  "PALAKONDA"
 ],
 [
  "1804",
  3,
  "NIDAMARRU (UNGUTURU)"
 ],
 [
  "M124",
  3,
  "BODDAM (RAJAM)"
 ],
 [
  "I147",
  3,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "C614",
  3,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "I907",
  3,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "B107",
  3,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "0294",
  3,
  "MANDASA (PALASA)"
 ],
 [
  "G126",
  3,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "S644",
  3,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "D153",
  3,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "C627",
  3,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "I254",
  3,
  "RANASTHALAM"
 ],
 [
  "2901",
  3,
  "PENUMANTRA (ACHANTA)"
 ],
 [
  "J055",
  3,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "C146",
  3,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "S117",
  3,
  "TERLAM (BADANGI)"
 ],
 [
  "R138",
  3,
  "VEERAGATTAM (PALAKONDA)"
 ],
 [
  "8108",
  3,
  "TANGELLAMUDI (DENDULURU)"
 ],
 [
  "P130",
  3,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "P567",
  3,
  "PATHAPATNAM"
 ],
 [
  "B057",
  3,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "K803",
  3,
  "KOTABOMMALI"
 ],
 [
  "1214",
  3,
  "MAHARANIPETA (WALTAIR)"
 ],
 [
  "N048",
  3,
  "SANTAKAVITI (RAJAM)"
 ],
 [
  "0672",
  3,
  "POLAVARAM"
 ],
 [
  "C176",
  3,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "P602",
  3,
  "SEETAMPETA (PALAKONDA)"
 ],
 [
  "S757",
  3,
  "SALURU"
 ],
 [
  "I102",
  3,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "C156",
  3,
  "DATTI RAJERU (GAJAPATHINAGARAM)"
 ],
 [
  "CH12",
  3,
  "CHIPURUPALLI"
 ],
 [
  "3803",
  3,
  "MARRIPALEM (KANCHARAPALEM)"
 ],
 [
  "D179",
  3,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "V528",
  3,
  "JAMI (S.KOTA)"
 ],
 [
  "S705",
  3,
  "SALURU"
 ],
 [
  "8842",
  3,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "R090",
  3,
  "VUDA VZM (VIZIANAGARAM)"
 ],
 [
  "I913",
  3,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "H836",
  3,
  "NATHAVARAM"
 ],
 [
  "J702",
  3,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "I189",
  3,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "C632",
  3,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "0385",
  3,
  "JEELUGUMILLI"
 ],
 [
  "S707",
  3,
  "SALURU"
 ],
 [
  "I409",
  3,
  "ETCHERLA"
 ],
 [
  "B144",
  3,
  "HIRAMANDALAM (PATHAPATNAM)"
 ],
 [
  "G119",
  3,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "2730",
  3,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "2714",
  3,
  "K.GANGAVARAM (RAMACHANDRAPURAM)"
 ],
 [
  "I301",
  3,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "I122",
  3,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "V440",
  3,
  "S.KOTA"
 ],
 [
  "R223",
  3,
  "VANGARA (RAJAM)"
 ],
 [
  "P102",
  3,
  "PALAKONDA"
 ],
 [
  "V526",
  3,
  "JAMI (S.KOTA)"
 ],
 [
  "I264",
  3,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "P259",
  3,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "7004",
  3,
  "ATTILI (TANUKU)"
 ],
 [
  "M145",
  3,
  "BODDAM (RAJAM)"
 ],
 [
  "G719",
  3,
  "GOLUGONDA (NATHAVARAM)"
 ],
 [
  "A250",
  3,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "S421",
  3,
  "MAKKUVA (SALURU)"
 ],
 [
  "J117",
  3,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "S679",
  3,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "A065",
  3,
  "BALAGA (SRIKAKULAM)"
 ],
 [
  "S101",
  3,
  "TERLAM (BADANGI)"
 ],
 [
  "8828",
  3,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "S104",
  3,
  "TERLAM (BADANGI)"
 ],
 [
  "G339",
  3,
  "GURLA (NELLIMARLA)"
 ],
 [
  "V109",
  3,
  "VEPADA (S.KOTA)"
 ],
 [
  "V223",
  3,
  "L.KOTA (S.KOTA)"
 ],
 [
  "S701",
  3,
  "SALURU"
 ],
 [
  "K733",
  3,
  "KOTABOMMALI"
 ],
 [
  "I337",
  3,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "I201",
  3,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "V518",
  3,
  "JAMI (S.KOTA)"
 ],
 [
  "K727",
  3,
  "KOTABOMMALI"
 ],
 [
  "N102",
  3,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "I229",
  3,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "G332",
  3,
  "GURLA (NELLIMARLA)"
 ],
 [
  "K783",
  3,
  "KOTABOMMALI"
 ],
 [
  "K040",
  3,
  "HUKUMPETA (PADERU)"
 ],
 [
  "0066",
  3,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "P135",
  3,
  "PALAKONDA"
 ],
 [
  "S308",
  3,
  "RAMBADRAPURAM (BADANGI)"
 ],
 [
  "S692",
  3,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "2323",
  3,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "S278",
  3,
  "GARA (SRIKAKULAM)"
 ],
 [
  "D279",
  3,
  "MENTADA (GAJAPATHINAGARAM)"
 ],
 [
  "J044",
  3,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "J051",
  3,
  "AMADALAVALASA"
 ],
 [
  "2032",
  3,
  "GANGAVARAM (RAMPACHODAVARAM)"
 ],
 [
  "0489",
  3,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "G302",
  3,
  "RAVIKAMATAM (MADUGULA)"
 ],
 [
  "J034",
  3,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "7142",
  3,
  "UNGUTURU"
 ],
 [
  "K710",
  3,
  "KOTABOMMALI"
 ],
 [
  "J775",
  3,
  "JALUMURU (KOTABOMMALI)"
 ],
 [
  "GV14",
  3,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "7711",
  3,
  "AGANAMPUDI"
 ],
 [
  "K050",
  3,
  "RAMBILLI (ATCHUTHAPURAM)"
 ],
 [
  "6627",
  3,
  "LANKELAPALEM (AGANAMPUDI)"
 ],
 [
  "V439",
  3,
  "S.KOTA"
 ],
 [
  "D235",
  3,
  "MENTADA (GAJAPATHINAGARAM)"
 ],
 [
  "V237",
  3,
  "L.KOTA (S.KOTA)"
 ],
 [
  "S338",
  3,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "S006",
  3,
  "BHEEMILI"
 ],
 [
  "5219",
  3,
  "MADEPALLI (DENDULURU)"
 ],
 [
  "MM26",
  3,
  "MERAKAMUDIDAM (CHIPURUPALLI)"
 ],
 [
  "P207",
  3,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "0330",
  3,
  "KAVITI (SOMPETA)"
 ],
 [
  "R236",
  3,
  "VANGARA (RAJAM)"
 ],
 [
  "C608",
  3,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "P114",
  3,
  "PALAKONDA"
 ],
 [
  "A220",
  3,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "S327",
  3,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "N041",
  3,
  "SANTAKAVITI (RAJAM)"
 ],
 [
  "S121",
  3,
  "TERLAM (BADANGI)"
 ],
 [
  "0029",
  3,
  "KAVITI (SOMPETA)"
 ],
 [
  "2326",
  3,
  "YELAMANCHILI (PALAKOL)"
 ],
 [
  "B151",
  3,
  "BHOGAPURAM"
 ],
 [
  "V118",
  3,
  "VEPADA (S.KOTA)"
 ],
 [
  "J058",
  3,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "S120",
  3,
  "TERLAM (BADANGI)"
 ],
 [
  "P104",
  3,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "B396",
  3,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "B176",
  3,
  "BHOGAPURAM"
 ],
 [
  "0965",
  3,
  "VAJRAPUKOTTURU (PALASA)"
 ],
 [
  "S730",
  3,
  "SALURU"
 ],
 [
  "B189",
  3,
  "BHOGAPURAM"
 ],
 [
  "J355",
  3,
  "PONDURU (ETCHERLA)"
 ],
 [
  "P123",
  3,
  "PALAKONDA"
 ],
 [
  "3253",
  3,
  "RAJAVOMMANGI (RAMPACHODAVARAM RURAL)"
 ],
 [
  "S606",
  3,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "D176",
  3,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "T350",
  3,
  "TEKKALI"
 ],
 [
  "B034",
  3,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "S151",
  3,
  "TERLAM (BADANGI)"
 ],
 [
  "P121",
  3,
  "PALAKONDA"
 ],
 [
  "S260",
  3,
  "GARA (SRIKAKULAM)"
 ],
 [
  "3404",
  3,
  "GANGAVARAM (RAMPACHODAVARAM)"
 ],
 [
  "8007",
  3,
  "PENUGONDA (ACHANTA)"
 ],
 [
  "P215",
  3,
  "BURJA (AMADALAVALASA)"
 ],
 [
  "S683",
  3,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "V356",
  3,
  "KOTTAVALASA (S.KOTA)"
 ],
 [
  "S704",
  3,
  "SALURU"
 ],
 [
  "B008",
  3,
  "ANANDAPURAM"
 ],
 [
  "1453",
  3,
  "KANCHARAPALEM"
 ],
 [
  "V205",
  3,
  "L.KOTA (S.KOTA)"
 ],
 [
  "G130",
  3,
  "S.RAYAVARAM (ELAMANCHILI)"
 ],
 [
  "C617",
  3,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "2710",
  3,
  "ACHANTA"
 ],
 [
  "M013",
  3,
  "CHEEDIKADA (MADUGULA)"
 ],
 [
  "B037",
  3,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "D136",
  3,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "T366",
  3,
  "TEKKALI"
 ],
 [
  "P145",
  3,
  "JAGANNADHAPURAM (BOBBILI)"
 ],
 [
  "A217",
  3,
  "NARSIPURAM (PARVATHIPURAM)"
 ],
 [
  "I273",
  3,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "B384",
  3,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "B383",
  3,
  "PUSAPATI REGA (BHOGAPURAM)"
 ],
 [
  "T187",
  3,
  "TEKKALI"
 ],
 [
  "B279",
  3,
  "SANTHABOMMALI (TEKKALI)"
 ],
 [
  "G331",
  3,
  "RAVIKAMATAM (MADUGULA)"
 ],
 [
  "C629",
  3,
  "JIYYAMMAVALASA (KURUPAM ITDA)"
 ],
 [
  "G305",
  3,
  "RAVIKAMATAM (MADUGULA)"
 ],
 [
  "G409",
  3,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "B077",
  3,
  "KOTTURU (PATHAPATNAM)"
 ],
 [
  "I113",
  3,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "V239",
  3,
  "L.KOTA (S.KOTA)"
 ],
 [
  "J415",
  3,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "I523",
  3,
  "P.N.COLONY (SRIKAKULAM)"
 ],
 [
  "I243",
  3,
  "PYDIBHEEMAVARAM (RANASTHALAM)"
 ],
 [
  "J352",
  3,
  "PONDURU (ETCHERLA)"
 ],
 [
  "4210",
  3,
  "MOGALTURU (NARSAPURAM)"
 ],
 [
  "R133",
  3,
  "VEERAGATTAM (PALAKONDA)"
 ],
 [
  "T399",
  3,
  "TEKKALI"
 ],
 [
  "A116",
  3,
  "ARASAVALLI (SRIKAKULAM)"
 ],
 [
  "GV15",
  3,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "I327",
  3,
  "LAVERU (RANASTHALAM)"
 ],
 [
  "8807",
  3,
  "E.P.BONANGI (JNPC-PARAWADA)"
 ],
 [
  "0036",
  3,
  "ITCHAPURAM (SOMPETA)"
 ],
 [
  "8413",
  3,
  "DOWLESWARAM (MORAMPUDI)"
 ],
 [
  "V249",
  3,
  "L.KOTA (S.KOTA)"
 ],
 [
  "1153",
  3,
  "MALKAPURAM"
 ],
 [
  "N069",
  3,
  "URLAM (NARASANNAPETA)"
 ],
 [
  "K790",
  3,
  "KOTABOMMALI"
 ],
 [
  "I525",
  3,
  "ETCHERLA"
 ],
 [
  "J045",
  3,
  "THOGARAM (AMADALAVALASA)"
 ],
 [
  "S325",
  3,
  "SEETANAGARAM (PARVATHIPURAM)"
 ],
 [
  "6116",
  3,
  "BHAGYALAKSHMIPETA (TADEPALLIGUDEM)"
 ],
 [
  "N163",
  3,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "J078",
  3,
  "PADERU"
 ],
 [
  "0915",
  3,
  "KAVITI (SOMPETA)"
 ],
 [
  "0GSH",
  3,
  "GAJUWAKA"
 ],
 [
  "C125",
  3,
  "KOMARADA (PARVATHIPURAM)"
 ],
 [
  "N162",
  3,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "I433",
  3,
  "ETCHERLA"
 ],
 [
  "N146",
  3,
  "REGIDI AMADALAVALASA (RAJAM)"
 ],
 [
  "H844",
  3,
  "NATHAVARAM"
 ],
 [
  "1527",
  3,
  "PALAKOLE (PALAKOL)"
 ],
 [
  "3212",
  3,
  "SITARAMAPURAM (NARSAPURAM)"
 ],
 [
  "F713",
  3,
  "KOYYURU (CHINTAPALLI)"
 ],
 [
  "S676",
  3,
  "SARAVAKOTA (KOTABOMMALI)"
 ],
 [
  "1455",
  3,
  "KANCHARAPALEM"
 ],
 [
  "P388",
  3,
  "SEETAMPETA (PALAKONDA)"
 ],
 [
  "F746",
  3,
  "KOYYURU (CHINTAPALLI)"
 ],
 [
  "Y003",
  3,
  "PADMANABHAM (ANANDAPURAM)"
 ],
 [
  "K025",
  3,
  "KOMMADI (MADHURAWADA)"
 ],
 [
  "9229",
  3,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "9103",
  3,
  "CHINTOOR"
 ],
 [
  "P610",
  3,
  "PATHAPATNAM"
 ],
 [
  "0930",
  3,
  "NANDIGAM (TEKKALI)"
 ],
 [
  "J424",
  3,
  "G.SIGADAM (ETCHERLA)"
 ],
 [
  "3335",
  3,
  "ADDATEEGALA (RAMPACHODAVARAM RURAL)"
 ],
 [
  "V548",
  3,
  "JAMI (S.KOTA)"
 ],
 [
  "GV09",
  3,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "9123",
  3,
  "CHINTOOR"
 ],
 [
  "E515",
  3,
  "CHINTAPALLI"
 ],
 [
  "H862",
  3,
  "NATHAVARAM"
 ],
 [
  "9132",
  3,
  "CHINTOOR"
 ],
 [
  "D111",
  3,
  "BONDAPALLI (GAJAPATHINAGARAM)"
 ],
 [
  "G407",
  3,
  "NELLIMARLA"
 ],
 [
  "F612",
  3,
  "KOYYURU (CHINTAPALLI)"
 ],
 [
  "3119",
  3,
  "SITARAMAPURAM (NARSAPURAM)"
 ],
 [
  "G312",
  3,
  "RAVIKAMATAM (MADUGULA)"
 ],
 [
  "9204",
  3,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "9234",
  3,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "I148",
  3,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "1118",
  3,
  "BUTCHAYYAPETA (MADUGULA)"
 ],
 [
  "S008",
  3,
  "PM PALEM (MADHURAWADA)"
 ],
 [
  "MM53",
  3,
  "MERAKAMUDIDAM (CHIPURUPALLI)"
 ],
 [
  "F617",
  3,
  "KOYYURU (CHINTAPALLI)"
 ],
 [
  "3128",
  3,
  "TADIKALAPUDI (KAMAVARAPUKOTA)"
 ],
 [
  "GV05",
  3,
  "GARIVIDI (CHIPURUPALLI)"
 ],
 [
  "D029",
  3,
  "HUKUMPETA (PADERU)"
 ],
 [
  "9332",
  3,
  "KUNAVARAM (CHINTOOR)"
 ],
 [
  "0025",
  3,
  "SEETHANAGARAM (KORUKONDA)"
 ],
 [
  "E903",
  3,
  "CHINTAPALLI"
 ],
 [
  "I149",
  3,
  "POLAKI (NARASANNAPETA)"
 ],
 [
  "K393",
  3,
  "HUKUMPETA (PADERU)"
 ],
 [
  "G012",
  3,
  "K.KOTAPADU (CHODAVARAM)"
 ],
 [
  "G434",
  3,
  "ROLUGUNTA (NARSIPATNAM)"
 ],
 [
  "V409",
  3,
  "S.KOTA"
 ],
 [
  "4618",
  3,
  "KARAPA"
 ]
];

export const TOP_PITHAPURAM_AREA_CODES: AreaCodeItem[] = RAW_PITHAPURAM_CODES.map(([code, count, loc]) => ({
  code,
  count,
  loc,
  label: `${code} — ${loc} (${count})`,
}));

// Build fast lookup maps for Kakinada Circle
export const KAKINADA_CODE_TO_RECORDS = new Map<string, KakinadaAreaCodeRecord[]>();
export const KAKINADA_VILLAGE_TO_CODES = new Map<string, Set<string>>();

for (const item of KAKINADA_AREA_CODES) {
  const c = item.code.toUpperCase().trim();
  const v = item.village.toUpperCase().trim();
  if (!KAKINADA_CODE_TO_RECORDS.has(c)) {
    KAKINADA_CODE_TO_RECORDS.set(c, []);
  }
  KAKINADA_CODE_TO_RECORDS.get(c)!.push(item);

  if (!KAKINADA_VILLAGE_TO_CODES.has(v)) {
    KAKINADA_VILLAGE_TO_CODES.set(v, new Set());
  }
  KAKINADA_VILLAGE_TO_CODES.get(v)!.add(c);
}

// Group Kakinada records by code to combine all villages/sections
const kakinadaByCode = new Map<string, {
  code: string;
  villages: Set<string>;
  sections: Set<string>;
  divisions: Set<string>;
}>();

for (const item of KAKINADA_AREA_CODES) {
  const c = item.code.toUpperCase().trim();
  if (!kakinadaByCode.has(c)) {
    kakinadaByCode.set(c, {
      code: c,
      villages: new Set(),
      sections: new Set(),
      divisions: new Set(),
    });
  }
  const entry = kakinadaByCode.get(c)!;
  if (item.village) entry.villages.add(item.village);
  if (item.section) entry.sections.add(item.section);
  if (item.division) entry.divisions.add(item.division);
}

// Convert Kakinada items to AreaCodeItem with aggregated village and section descriptions
export const KAKINADA_CATALOG_ITEMS: AreaCodeItem[] = Array.from(kakinadaByCode.values()).map((entry) => {
  const villageList = Array.from(entry.villages).join(', ');
  const sectionList = Array.from(entry.sections).join(', ');
  const divList = Array.from(entry.divisions).join(', ');
  const primaryDivision = Array.from(entry.divisions)[0] || '';
  return {
    code: entry.code,
    count: 0,
    loc: `${villageList} (${sectionList}, ${divList})`,
    label: `${entry.code} — ${villageList} (${sectionList})`,
    division: primaryDivision,
    section: sectionList,
    village: villageList,
  };
});

// Merge Kakinada items with existing catalog
const existingCodesSet = new Set<string>();
const mergedItems: AreaCodeItem[] = [];

// 1. Add Kakinada items first
for (const item of KAKINADA_CATALOG_ITEMS) {
  if (!existingCodesSet.has(item.code)) {
    existingCodesSet.add(item.code);
    mergedItems.push(item);
  }
}

// 2. Add remaining raw catalog items
for (const [code, count, loc] of RAW_CATALOG) {
  if (!existingCodesSet.has(code)) {
    existingCodesSet.add(code);
    mergedItems.push({
      code,
      count,
      loc,
      label: `${code} — ${loc} (${count})`,
    });
  }
}

export const ALL_AREA_CODES: AreaCodeItem[] = mergedItems;

// Quick lookup map by code
export const AREA_CODE_MAP = new Map<string, AreaCodeItem>(
  ALL_AREA_CODES.map((item) => [item.code, item])
);

/**
 * Searches Kakinada Circle area codes and villages by query.
 * If query is a 4-digit code (e.g. "0105"), returns matching area code(s).
 * If query is a village/area name (e.g. "Borampalem"), returns all area codes for that village!
 */
export function findAreaCodesForQuery(query: string, maxResults = 30): string[] {
  const clean = query.trim().toUpperCase();
  if (!clean || clean.length < 2) return [];
  const results = new Set<string>();

  // 1. Direct code match (exact 4-digit code)
  if (KAKINADA_CODE_TO_RECORDS.has(clean)) {
    results.add(clean);
  }

  // 2. Exact village match
  if (KAKINADA_VILLAGE_TO_CODES.has(clean)) {
    KAKINADA_VILLAGE_TO_CODES.get(clean)!.forEach((c) => results.add(c));
  }

  // 3. Partial village or section or division match (if >= 3 chars)
  if (clean.length >= 3) {
    for (const item of KAKINADA_AREA_CODES) {
      if (
        item.village.includes(clean) ||
        item.section.includes(clean) ||
        item.subdivision.includes(clean) ||
        item.division.includes(clean)
      ) {
        results.add(item.code);
        if (results.size >= maxResults) break;
      }
    }
  }

  // 4. Partial numeric code match (e.g. "010" or "714")
  if (/^\d{2,4}$/.test(clean)) {
    for (const [code] of KAKINADA_CODE_TO_RECORDS) {
      if (code.includes(clean)) {
        results.add(code);
        if (results.size >= maxResults) break;
      }
    }
  }

  // 5. Fallback: check ALL_AREA_CODES if still under limit
  if (results.size < maxResults && clean.length >= 3) {
    for (const item of ALL_AREA_CODES) {
      if (item.code.includes(clean) || item.loc.toUpperCase().includes(clean)) {
        results.add(item.code);
        if (results.size >= maxResults) break;
      }
    }
  }

  return Array.from(results).slice(0, maxResults);
}

/**
 * Returns all village names associated with an area code
 */
export function findVillagesForCode(code: string): string[] {
  const clean = code.trim().toUpperCase();
  const records = KAKINADA_CODE_TO_RECORDS.get(clean);
  if (!records || records.length === 0) {
    const fallback = AREA_CODE_MAP.get(clean);
    return fallback ? [fallback.loc] : [];
  }
  return records.map((r) => `${r.village} (${r.section}, ${r.division})`);
}
