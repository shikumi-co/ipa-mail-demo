// 偽データ（すべて架空。実在の人名・住所ではありません）。操作で変わった状態はメモリ上だけで、再読み込みで戻ります。
// 作り方: 顧客 30 件の希望条件は「自動で選ぶ」で 1 物件あたり 5〜12 件が当たるように調整（README の「決めたこと」）
window.MOCK_DATA = {
 "today": "2026-10-20T09:30",
 "owners": [
  {
   "id": "u1",
   "name": "（例）佐藤"
  },
  {
   "id": "u2",
   "name": "（例）鈴木"
  },
  {
   "id": "u3",
   "name": "（例）高橋"
  }
 ],
 "tags": [
  "経営者",
  "会社員",
  "リピーター",
  "紹介",
  "セミナー参加"
 ],
 "properties": [
  {
   "id": "p01",
   "name": "（例）南青山レジデンス",
   "pref": "東京都",
   "city": "港区",
   "addr": "南青山2-1-1",
   "price": 78000,
   "yield": 4.2,
   "year": 2015,
   "structure": "RC",
   "kind": "一棟マンション",
   "published": true,
   "docUrl": "https://example.com/docs/p01-overview.pdf",
   "memo": "（例）レントロールあり。現況満室",
   "createdAt": "2026-10-01T09:00"
  },
  {
   "id": "p02",
   "name": "（例）中野ハイツ",
   "pref": "東京都",
   "city": "中野区",
   "addr": "中野5-2-3",
   "price": 9800,
   "yield": 7.4,
   "year": 2004,
   "structure": "木造",
   "kind": "一棟アパート",
   "published": true,
   "docUrl": "https://example.com/docs/p02-overview.pdf",
   "memo": "",
   "createdAt": "2026-10-02T09:00"
  },
  {
   "id": "p03",
   "name": "（例）関内ビル",
   "pref": "神奈川県",
   "city": "横浜市中区",
   "addr": "相生町3-4-5",
   "price": 32000,
   "yield": 6.8,
   "year": 1991,
   "structure": "SRC",
   "kind": "一棟マンション",
   "published": true,
   "docUrl": "https://example.com/docs/p03-overview.pdf",
   "memo": "",
   "createdAt": "2026-10-03T09:00"
  },
  {
   "id": "p04",
   "name": "（例）武蔵小杉テラス",
   "pref": "神奈川県",
   "city": "川崎市中原区",
   "addr": "小杉町1-6-2",
   "price": 12500,
   "yield": 6.9,
   "year": 2012,
   "structure": "S",
   "kind": "一棟アパート",
   "published": true,
   "docUrl": "https://example.com/docs/p04-overview.pdf",
   "memo": "",
   "createdAt": "2026-10-04T09:00"
  },
  {
   "id": "p05",
   "name": "（例）なんば駅南 302 号室",
   "pref": "大阪府",
   "city": "大阪市浪速区",
   "addr": "難波中2-8-1",
   "price": 3200,
   "yield": 5.6,
   "year": 2008,
   "structure": "RC",
   "kind": "区分",
   "published": true,
   "docUrl": "https://example.com/docs/p05-overview.pdf",
   "memo": "（例）レントロールあり。現況満室",
   "createdAt": "2026-10-05T09:00"
  },
  {
   "id": "p06",
   "name": "（例）江坂レジデンス",
   "pref": "大阪府",
   "city": "吹田市",
   "addr": "豊津町9-3",
   "price": 41000,
   "yield": 7.9,
   "year": 1998,
   "structure": "RC",
   "kind": "一棟マンション",
   "published": true,
   "docUrl": "https://example.com/docs/p06-overview.pdf",
   "memo": "",
   "createdAt": "2026-10-06T09:00"
  },
  {
   "id": "p07",
   "name": "（例）名駅南コーポ",
   "pref": "愛知県",
   "city": "名古屋市中村区",
   "addr": "名駅南4-2-7",
   "price": 6800,
   "yield": 9.8,
   "year": 1995,
   "structure": "木造",
   "kind": "一棟アパート",
   "published": true,
   "docUrl": "https://example.com/docs/p07-overview.pdf",
   "memo": "",
   "createdAt": "2026-10-07T09:00"
  },
  {
   "id": "p08",
   "name": "（例）栄センタービル",
   "pref": "愛知県",
   "city": "名古屋市中区",
   "addr": "栄3-11-4",
   "price": 26000,
   "yield": 8.6,
   "year": 1985,
   "structure": "SRC",
   "kind": "一棟マンション",
   "published": true,
   "docUrl": "https://example.com/docs/p08-overview.pdf",
   "memo": "",
   "createdAt": "2026-10-08T09:00"
  },
  {
   "id": "p09",
   "name": "（例）博多駅前レジデンス",
   "pref": "福岡県",
   "city": "福岡市博多区",
   "addr": "博多駅南1-5-9",
   "price": 38000,
   "yield": 5.4,
   "year": 2019,
   "structure": "RC",
   "kind": "一棟マンション",
   "published": true,
   "docUrl": "https://example.com/docs/p09-overview.pdf",
   "memo": "（例）レントロールあり。現況満室",
   "createdAt": "2026-10-09T09:00"
  },
  {
   "id": "p10",
   "name": "（例）大濠公園の戸建",
   "pref": "福岡県",
   "city": "福岡市中央区",
   "addr": "荒戸2-3-8",
   "price": 4500,
   "yield": 6.2,
   "year": 2010,
   "structure": "木造",
   "kind": "戸建",
   "published": true,
   "docUrl": "https://example.com/docs/p10-overview.pdf",
   "memo": "",
   "createdAt": "2026-10-01T09:00"
  },
  {
   "id": "p11",
   "name": "（例）小倉北一棟",
   "pref": "福岡県",
   "city": "北九州市小倉北区",
   "addr": "京町1-7-3",
   "price": 8800,
   "yield": 12,
   "year": 1988,
   "structure": "RC",
   "kind": "一棟マンション",
   "published": true,
   "docUrl": "https://example.com/docs/p11-overview.pdf",
   "memo": "",
   "createdAt": "2026-10-02T09:00"
  },
  {
   "id": "p12",
   "name": "（例）大宮駅東の土地",
   "pref": "埼玉県",
   "city": "さいたま市大宮区",
   "addr": "大門町2-14",
   "price": 15000,
   "yield": 4,
   "year": null,
   "structure": null,
   "kind": "土地",
   "published": false,
   "docUrl": "https://example.com/docs/p12-overview.pdf",
   "memo": "",
   "createdAt": "2026-10-03T09:00"
  }
 ],
 "contacts": [
  {
   "id": "c01",
   "name": "（例）山田 健一",
   "email": "contact01@example.com",
   "phone": "03-0000-1007",
   "ownerId": "u1",
   "tags": [
    "経営者",
    "リピーター"
   ],
   "memo": "（例）年内に 1 棟買い増し予定",
   "prefs": {
    "areas": [
     "東京都",
     "神奈川県"
    ],
    "priceMin": null,
    "priceMax": 10000,
    "yieldMin": 7,
    "yearMin": 2000,
    "structures": [
     "S",
     "RC"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c02",
   "name": "（例）佐々木 美咲",
   "email": "contact02@example.com",
   "phone": "03-0000-1014",
   "ownerId": "u2",
   "tags": [
    "会社員"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "大阪府",
     "神奈川県",
     "東京都"
    ],
    "priceMin": 3000,
    "priceMax": null,
    "yieldMin": null,
    "yearMin": null,
    "structures": [
     "RC",
     "木造"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c03",
   "name": "（例）田村 大輔",
   "email": "contact03@example.com",
   "phone": "03-0000-1021",
   "ownerId": "u3",
   "tags": [
    "リピーター"
   ],
   "memo": "",
   "prefs": {
    "areas": [],
    "priceMin": null,
    "priceMax": null,
    "yieldMin": null,
    "yearMin": 1990,
    "structures": []
   },
   "line": {
    "linked": true,
    "at": "2026-10-08T19:12"
   },
   "unsubscribed": false
  },
  {
   "id": "c04",
   "name": "（例）中島 由美",
   "email": "contact04@example.com",
   "phone": "03-0000-1028",
   "ownerId": "u1",
   "tags": [
    "紹介"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "福岡県",
     "東京都"
    ],
    "priceMin": null,
    "priceMax": null,
    "yieldMin": null,
    "yearMin": null,
    "structures": [
     "S",
     "木造"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c05",
   "name": "（例）小林 拓也",
   "email": "contact05@example.com",
   "phone": "03-0000-1035",
   "ownerId": "u2",
   "tags": [
    "セミナー参加",
    "会社員"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "神奈川県",
     "大阪府",
     "東京都"
    ],
    "priceMin": 5000,
    "priceMax": null,
    "yieldMin": 6,
    "yearMin": 2000,
    "structures": []
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c06",
   "name": "（例）加藤 恵子",
   "email": "contact06@example.com",
   "phone": "03-0000-1042",
   "ownerId": "u3",
   "tags": [
    "経営者"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "東京都"
    ],
    "priceMin": null,
    "priceMax": 30000,
    "yieldMin": null,
    "yearMin": null,
    "structures": [
     "SRC",
     "S"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c07",
   "name": "（例）吉田 翔太",
   "email": "contact07@example.com",
   "phone": "03-0000-1049",
   "ownerId": "u1",
   "tags": [
    "会社員"
   ],
   "memo": "（例）年内に 1 棟買い増し予定",
   "prefs": {
    "areas": [
     "東京都"
    ],
    "priceMin": null,
    "priceMax": null,
    "yieldMin": null,
    "yearMin": 1990,
    "structures": []
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c08",
   "name": "（例）山口 真由美",
   "email": "contact08@example.com",
   "phone": "03-0000-1056",
   "ownerId": "u2",
   "tags": [
    "リピーター"
   ],
   "memo": "",
   "prefs": {
    "areas": [],
    "priceMin": 3000,
    "priceMax": null,
    "yieldMin": null,
    "yearMin": null,
    "structures": []
   },
   "line": {
    "linked": true,
    "at": "2026-10-11T08:40"
   },
   "unsubscribed": false
  },
  {
   "id": "c09",
   "name": "（例）松本 直樹",
   "email": "contact09@example.com",
   "phone": "03-0000-1063",
   "ownerId": "u3",
   "tags": [
    "紹介",
    "経営者"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "神奈川県",
     "大阪府"
    ],
    "priceMin": 3000,
    "priceMax": null,
    "yieldMin": 5,
    "yearMin": 1990,
    "structures": [
     "木造",
     "SRC"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c10",
   "name": "（例）井上 陽子",
   "email": "contact10@example.com",
   "phone": "03-0000-1070",
   "ownerId": "u1",
   "tags": [
    "セミナー参加"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "埼玉県",
     "福岡県",
     "東京都"
    ],
    "priceMin": null,
    "priceMax": null,
    "yieldMin": null,
    "yearMin": 1990,
    "structures": []
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c11",
   "name": "（例）木村 和也",
   "email": "contact11@example.com",
   "phone": "03-0000-1077",
   "ownerId": "u2",
   "tags": [
    "経営者"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "大阪府",
     "東京都"
    ],
    "priceMin": null,
    "priceMax": null,
    "yieldMin": 6,
    "yearMin": null,
    "structures": []
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c12",
   "name": "（例）林 麻衣",
   "email": "contact12@example.com",
   "phone": "03-0000-1084",
   "ownerId": "u3",
   "tags": [
    "会社員"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "東京都"
    ],
    "priceMin": null,
    "priceMax": 80000,
    "yieldMin": 7,
    "yearMin": 2000,
    "structures": []
   },
   "line": {
    "linked": true,
    "at": "2026-10-16T21:05"
   },
   "unsubscribed": false
  },
  {
   "id": "c13",
   "name": "（例）清水 隆",
   "email": "contact13@example.com",
   "phone": "03-0000-1091",
   "ownerId": "u1",
   "tags": [
    "リピーター",
    "セミナー参加"
   ],
   "memo": "（例）年内に 1 棟買い増し予定",
   "prefs": {
    "areas": [],
    "priceMin": null,
    "priceMax": 50000,
    "yieldMin": null,
    "yearMin": 1990,
    "structures": [
     "RC"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c14",
   "name": "（例）山崎 沙織",
   "email": "contact14@example.com",
   "phone": "03-0000-1098",
   "ownerId": "u2",
   "tags": [
    "紹介"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "大阪府",
     "東京都",
     "福岡県"
    ],
    "priceMin": null,
    "priceMax": null,
    "yieldMin": 7,
    "yearMin": 2000,
    "structures": [
     "S",
     "SRC"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c15",
   "name": "（例）森 雄大",
   "email": "contact15@example.com",
   "phone": "03-0000-1105",
   "ownerId": "u3",
   "tags": [
    "セミナー参加"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "埼玉県",
     "東京都"
    ],
    "priceMin": null,
    "priceMax": 30000,
    "yieldMin": 7,
    "yearMin": null,
    "structures": [
     "S",
     "SRC"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c16",
   "name": "（例）池田 千春",
   "email": "contact16@example.com",
   "phone": "03-0000-1112",
   "ownerId": "u1",
   "tags": [
    "経営者"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "埼玉県",
     "大阪府"
    ],
    "priceMin": null,
    "priceMax": 50000,
    "yieldMin": 5,
    "yearMin": null,
    "structures": []
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c17",
   "name": "（例）橋本 浩二",
   "email": "contact17@example.com",
   "phone": "03-0000-1119",
   "ownerId": "u2",
   "tags": [
    "会社員",
    "紹介"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "福岡県",
     "神奈川県"
    ],
    "priceMin": 3000,
    "priceMax": null,
    "yieldMin": null,
    "yearMin": 1990,
    "structures": [
     "RC",
     "SRC"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c18",
   "name": "（例）阿部 奈々",
   "email": "contact18@example.com",
   "phone": "03-0000-1126",
   "ownerId": "u3",
   "tags": [
    "リピーター"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "愛知県",
     "福岡県",
     "大阪府"
    ],
    "priceMin": 5000,
    "priceMax": 10000,
    "yieldMin": 6,
    "yearMin": null,
    "structures": [
     "RC",
     "木造"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c19",
   "name": "（例）石川 剛",
   "email": "contact19@example.com",
   "phone": "03-0000-1133",
   "ownerId": "u1",
   "tags": [
    "紹介"
   ],
   "memo": "（例）年内に 1 棟買い増し予定",
   "prefs": {
    "areas": [],
    "priceMin": null,
    "priceMax": 30000,
    "yieldMin": 7,
    "yearMin": null,
    "structures": [
     "SRC",
     "RC"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c20",
   "name": "（例）前田 美香",
   "email": "contact20@example.com",
   "phone": "03-0000-1140",
   "ownerId": "u2",
   "tags": [
    "セミナー参加"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "東京都",
     "大阪府"
    ],
    "priceMin": null,
    "priceMax": null,
    "yieldMin": 7,
    "yearMin": null,
    "structures": []
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c21",
   "name": "（例）藤田 亮",
   "email": "contact21@example.com",
   "phone": "03-0000-1147",
   "ownerId": "u3",
   "tags": [
    "経営者",
    "リピーター"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "埼玉県",
     "福岡県"
    ],
    "priceMin": null,
    "priceMax": 80000,
    "yieldMin": null,
    "yearMin": null,
    "structures": []
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c22",
   "name": "（例）岡田 裕子",
   "email": "contact22@example.com",
   "phone": "03-0000-1154",
   "ownerId": "u1",
   "tags": [
    "会社員"
   ],
   "memo": "",
   "prefs": {
    "areas": [],
    "priceMin": null,
    "priceMax": null,
    "yieldMin": 6,
    "yearMin": null,
    "structures": []
   },
   "line": {
    "linked": true,
    "at": "2026-10-17T12:30"
   },
   "unsubscribed": false
  },
  {
   "id": "c23",
   "name": "（例）後藤 誠",
   "email": "contact23@example.com",
   "phone": "03-0000-1161",
   "ownerId": "u2",
   "tags": [
    "リピーター"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "福岡県",
     "神奈川県"
    ],
    "priceMin": null,
    "priceMax": null,
    "yieldMin": 7,
    "yearMin": null,
    "structures": []
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c24",
   "name": "（例）長谷川 彩",
   "email": "contact24@example.com",
   "phone": "03-0000-1168",
   "ownerId": "u3",
   "tags": [
    "紹介"
   ],
   "memo": "",
   "prefs": {
    "areas": [],
    "priceMin": 5000,
    "priceMax": null,
    "yieldMin": null,
    "yearMin": 1990,
    "structures": [
     "S"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c25",
   "name": "（例）村上 俊介",
   "email": "contact25@example.com",
   "phone": "03-0000-1175",
   "ownerId": "u1",
   "tags": [
    "セミナー参加",
    "会社員"
   ],
   "memo": "（例）年内に 1 棟買い増し予定",
   "prefs": {
    "areas": [
     "愛知県",
     "福岡県"
    ],
    "priceMin": null,
    "priceMax": 80000,
    "yieldMin": 7,
    "yearMin": null,
    "structures": []
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c26",
   "name": "（例）近藤 理恵",
   "email": "contact26@example.com",
   "phone": "03-0000-1182",
   "ownerId": "u2",
   "tags": [
    "経営者"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "大阪府",
     "福岡県",
     "愛知県"
    ],
    "priceMin": null,
    "priceMax": null,
    "yieldMin": null,
    "yearMin": null,
    "structures": []
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c27",
   "name": "（例）石井 聡",
   "email": "contact27@example.com",
   "phone": "03-0000-1189",
   "ownerId": "u3",
   "tags": [
    "会社員"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "東京都",
     "福岡県"
    ],
    "priceMin": null,
    "priceMax": 50000,
    "yieldMin": null,
    "yearMin": 2000,
    "structures": [
     "RC"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c28",
   "name": "（例）坂本 久美子",
   "email": "contact28@example.com",
   "phone": "03-0000-1196",
   "ownerId": "u1",
   "tags": [
    "リピーター"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "大阪府"
    ],
    "priceMin": null,
    "priceMax": 80000,
    "yieldMin": 6,
    "yearMin": null,
    "structures": []
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c29",
   "name": "（例）遠藤 貴之",
   "email": "contact29@example.com",
   "phone": "03-0000-1203",
   "ownerId": "u2",
   "tags": [
    "紹介",
    "経営者"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "神奈川県",
     "東京都"
    ],
    "priceMin": null,
    "priceMax": 30000,
    "yieldMin": 6,
    "yearMin": null,
    "structures": []
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  },
  {
   "id": "c30",
   "name": "（例）青木 愛",
   "email": "contact30@example.com",
   "phone": "03-0000-1210",
   "ownerId": "u3",
   "tags": [
    "セミナー参加"
   ],
   "memo": "",
   "prefs": {
    "areas": [
     "大阪府",
     "福岡県"
    ],
    "priceMin": null,
    "priceMax": null,
    "yieldMin": null,
    "yearMin": 2000,
    "structures": [
     "SRC",
     "木造"
    ]
   },
   "line": {
    "linked": false,
    "at": null
   },
   "unsubscribed": false
  }
 ],
 "campaigns": [
  {
   "id": "m1",
   "no": 1000001,
   "subject": "【新着】都内・川崎の一棟アパート 2 件のご案内",
   "body": "いつもお世話になっております。\n新しく入った物件をご案内します。ご希望の条件に合うものを下にまとめました。\n気になる物件があれば、物件ごとの「この物件を問い合わせる」からお気軽にどうぞ。",
   "propertyIds": [
    "p02",
    "p04"
   ],
   "status": "sent",
   "sentAt": "2026-10-06T10:00",
   "scheduledAt": null,
   "recipients": [
    {
     "contactId": "c02",
     "openedAt": null
    },
    {
     "contactId": "c03",
     "openedAt": null
    },
    {
     "contactId": "c04",
     "openedAt": null
    },
    {
     "contactId": "c05",
     "openedAt": null
    },
    {
     "contactId": "c07",
     "openedAt": "2026-10-06T18:42"
    },
    {
     "contactId": "c08",
     "openedAt": "2026-10-06T13:12"
    },
    {
     "contactId": "c10",
     "openedAt": "2026-10-06T16:35"
    },
    {
     "contactId": "c11",
     "openedAt": "2026-10-06T15:13"
    },
    {
     "contactId": "c12",
     "openedAt": null
    },
    {
     "contactId": "c20",
     "openedAt": "2026-10-06T18:00"
    },
    {
     "contactId": "c22",
     "openedAt": null
    },
    {
     "contactId": "c24",
     "openedAt": null
    },
    {
     "contactId": "c29",
     "openedAt": "2026-10-06T15:16"
    }
   ]
  },
  {
   "id": "m2",
   "no": 1000002,
   "subject": "【新着】大阪の一棟マンション・区分のご案内",
   "body": "いつもお世話になっております。\n新しく入った物件をご案内します。ご希望の条件に合うものを下にまとめました。\n気になる物件があれば、物件ごとの「この物件を問い合わせる」からお気軽にどうぞ。",
   "propertyIds": [
    "p06",
    "p05"
   ],
   "status": "sent",
   "sentAt": "2026-10-10T10:00",
   "scheduledAt": null,
   "recipients": [
    {
     "contactId": "c02",
     "openedAt": null
    },
    {
     "contactId": "c03",
     "openedAt": null
    },
    {
     "contactId": "c08",
     "openedAt": null
    },
    {
     "contactId": "c11",
     "openedAt": "2026-10-10T14:04"
    },
    {
     "contactId": "c13",
     "openedAt": null
    },
    {
     "contactId": "c16",
     "openedAt": null
    },
    {
     "contactId": "c20",
     "openedAt": "2026-10-10T12:26"
    },
    {
     "contactId": "c22",
     "openedAt": "2026-10-10T12:40"
    },
    {
     "contactId": "c26",
     "openedAt": null
    },
    {
     "contactId": "c28",
     "openedAt": null
    }
   ]
  },
  {
   "id": "m3",
   "no": 1000003,
   "subject": "【新着】福岡の 3 物件（利回り 12% あり）",
   "body": "いつもお世話になっております。\n新しく入った物件をご案内します。ご希望の条件に合うものを下にまとめました。\n気になる物件があれば、物件ごとの「この物件を問い合わせる」からお気軽にどうぞ。",
   "propertyIds": [
    "p09",
    "p10",
    "p11"
   ],
   "status": "sent",
   "sentAt": "2026-10-15T10:00",
   "scheduledAt": null,
   "recipients": [
    {
     "contactId": "c03",
     "openedAt": null
    },
    {
     "contactId": "c04",
     "openedAt": null
    },
    {
     "contactId": "c08",
     "openedAt": null
    },
    {
     "contactId": "c10",
     "openedAt": null
    },
    {
     "contactId": "c13",
     "openedAt": null
    },
    {
     "contactId": "c17",
     "openedAt": null
    },
    {
     "contactId": "c18",
     "openedAt": "2026-10-15T15:16"
    },
    {
     "contactId": "c19",
     "openedAt": null
    },
    {
     "contactId": "c21",
     "openedAt": "2026-10-15T14:33"
    },
    {
     "contactId": "c22",
     "openedAt": "2026-10-15T10:08"
    },
    {
     "contactId": "c23",
     "openedAt": "2026-10-15T14:50"
    },
    {
     "contactId": "c25",
     "openedAt": null
    },
    {
     "contactId": "c26",
     "openedAt": null
    },
    {
     "contactId": "c27",
     "openedAt": "2026-10-15T11:30"
    },
    {
     "contactId": "c30",
     "openedAt": "2026-10-15T18:36"
    }
   ]
  },
  {
   "id": "m4",
   "no": 1000004,
   "subject": "【新着】名古屋の 2 物件のご案内",
   "body": "いつもお世話になっております。\n新しく入った物件をご案内します。ご希望の条件に合うものを下にまとめました。\n気になる物件があれば、物件ごとの「この物件を問い合わせる」からお気軽にどうぞ。",
   "propertyIds": [
    "p07",
    "p08"
   ],
   "status": "scheduled",
   "sentAt": null,
   "scheduledAt": "2026-10-20T15:00",
   "recipients": [
    {
     "contactId": "c03",
     "openedAt": null
    },
    {
     "contactId": "c08",
     "openedAt": null
    },
    {
     "contactId": "c18",
     "openedAt": null
    },
    {
     "contactId": "c19",
     "openedAt": null
    },
    {
     "contactId": "c22",
     "openedAt": null
    },
    {
     "contactId": "c25",
     "openedAt": null
    },
    {
     "contactId": "c26",
     "openedAt": null
    }
   ]
  },
  {
   "id": "m5",
   "no": 1000005,
   "subject": "（下書き）関内の一棟ビルのご案内",
   "body": "いつもお世話になっております。\n新しく入った物件をご案内します。ご希望の条件に合うものを下にまとめました。\n気になる物件があれば、物件ごとの「この物件を問い合わせる」からお気軽にどうぞ。",
   "propertyIds": [
    "p03"
   ],
   "status": "draft",
   "sentAt": null,
   "scheduledAt": null,
   "recipients": [
    {
     "contactId": "c03",
     "openedAt": null
    },
    {
     "contactId": "c08",
     "openedAt": null
    },
    {
     "contactId": "c09",
     "openedAt": null
    },
    {
     "contactId": "c17",
     "openedAt": null
    },
    {
     "contactId": "c22",
     "openedAt": null
    }
   ]
  }
 ],
 "inquiries": [
  {
   "id": "q1",
   "campaignId": "m1",
   "propertyId": "p02",
   "contactId": "c07",
   "at": "2026-10-06T15:20",
   "message": "（例）レントロールを見たいです。内見はいつ可能ですか。",
   "status": "対応中"
  },
  {
   "id": "q2",
   "campaignId": "m1",
   "propertyId": "p04",
   "contactId": "c08",
   "at": "2026-10-07T09:05",
   "message": "（例）融資の目安を知りたいです。",
   "status": "未対応"
  },
  {
   "id": "q3",
   "campaignId": "m2",
   "propertyId": "p06",
   "contactId": "c11",
   "at": "2026-10-11T11:42",
   "message": "（例）修繕履歴はありますか。",
   "status": "対応済み"
  },
  {
   "id": "q4",
   "campaignId": "m3",
   "propertyId": "p11",
   "contactId": "c18",
   "at": "2026-10-16T08:15",
   "message": "（例）利回り 12% の根拠（満室想定か現況か）を教えてください。",
   "status": "未対応"
  }
 ],
 "prefHistory": [
  {
   "id": "h1",
   "contactId": "c05",
   "at": "2026-10-09T22:10",
   "by": "self",
   "summary": "利回りの下限 5.0% → 6.0%"
  },
  {
   "id": "h2",
   "contactId": "c12",
   "at": "2026-10-14T07:55",
   "by": "self",
   "summary": "希望エリアに 東京都 を追加"
  },
  {
   "id": "h3",
   "contactId": "c18",
   "at": "2026-10-12T16:30",
   "by": "staff",
   "summary": "価格の上限 8,000 万円 → 10,000 万円（社内担当が電話で聞いて変更）"
  }
 ],
 "followups": [
  {
   "id": "f1",
   "no": 1000006,
   "campaignId": "m2",
   "target": "unopened",
   "at": "2026-10-21T10:00",
   "subject": "【再送】大阪の一棟マンション・区分のご案内",
   "body": "先日お送りしたご案内を、まだご覧になっていない方にお送りしています。\nいつもお世話になっております。\n新しく入った物件をご案内します。ご希望の条件に合うものを下にまとめました。\n気になる物件があれば、物件ごとの「この物件を問い合わせる」からお気軽にどうぞ。",
   "status": "scheduled"
  }
 ],
 "settings": {
  "unsubscribeText": "今後このメールが不要な方は、下の「配信停止」から手続きできます。",
  "lineChannelId": "",
  "lineChannelSecret": "",
  "senderName": "（例）IPA 不動産 営業部"
 }
};
