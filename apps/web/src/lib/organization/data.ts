/** Church leaders and members as a tree, summarized from the General Handbook
 *  (December 2025). `section` points at the handbook section the summary draws on. */
export type OrgNode = {
  id: string;
  title: string;
  /** One line shown on the map itself. */
  tagline: string;
  summary: string;
  duties?: string[];
  calledBy?: string;
  section?: string;
  /** The calling this one serves under, by id — its line of priesthood keys and direction. */
  under?: string;
  /** Core scriptures, written as "Book chapter:verse". See `scriptureHref`. */
  scriptures?: string[];
  children?: OrgNode[];
};

const BOOKS: Record<string, [volume: string, book: string]> = {
  Genesis: ["oldtestament", "genesis"],
  Isaiah: ["oldtestament", "isaiah"],
  Malachi: ["oldtestament", "malachi"],
  Matthew: ["newtestament", "matthew"],
  Luke: ["newtestament", "luke"],
  John: ["newtestament", "john"],
  "1 Corinthians": ["newtestament", "1corinthians"],
  Ephesians: ["newtestament", "ephesians"],
  "1 Timothy": ["newtestament", "1timothy"],
  Mosiah: ["bookofmormon", "mosiah"],
  "3 Nephi": ["bookofmormon", "3nephi"],
  Moroni: ["bookofmormon", "moroni"],
  "D&C": ["doctrineandcovenants", "doctrineandcovenants"],
  "Articles of Faith": ["pearlofgreatprice", "articlesoffaith"],
};

export function scriptureHref(ref: string): string {
  const [, book, chapter, verse] = ref.match(/^(.+) (\d+):(\d+)$/)!;
  const [volume, id] = BOOKS[book];
  return `/read/${volume}/${id}/${chapter}#v${verse}`;
}

export const ORGANIZATION: OrgNode = {
  id: "church",
  title: "The Church of Jesus Christ",
  tagline: "Led by Jesus Christ through living prophets",
  summary:
    "Jesus Christ leads His Church through prophets and apostles. Leaders at every level — general, area, stake, and ward — hold callings to help God's children come unto Christ, and every member has a part in God's work of salvation and exaltation.",
  duties: [
    "Help members live the gospel of Jesus Christ",
    "Care for those in need",
    "Invite all to receive the gospel",
    "Unite families for eternity",
  ],
  section: "1.2–1.4",
  scriptures: ["Ephesians 4:11", "Articles of Faith 1:6"],
  children: [
    {
      id: "general",
      title: "General Leadership",
      tagline: "Leaders who serve the whole worldwide Church",
      summary:
        "The word general means these callings are not limited by geography. General Authorities and General Officers lead, teach, and minister to Church members throughout the world.",
      section: "5.1",
      children: [
        {
          id: "president",
          title: "President of the Church",
          tagline: "Prophet, seer, and revelator; the senior Apostle",
          summary:
            "Under the Lord's direction, the President of the Church presides over the Church. He is the only person on earth authorized to exercise all priesthood keys, and he can receive revelation and declare the will of God for the whole Church.",
          duties: [
            "Preside over the entire Church",
            "Receive revelation for the whole Church",
            "Call counselors to form the First Presidency",
          ],
          section: "5.1.1.1",
          under: "church",
          scriptures: ["D&C 107:91", "D&C 21:4"],
        },
        {
          id: "first-presidency",
          title: "First Presidency",
          tagline: "The President and his counselors",
          summary:
            "The President of the Church and his counselors form the quorum of the First Presidency. They are Apostles and special witnesses of Jesus Christ, and they preside over and direct all the affairs of the Church — the role Peter, James, and John filled anciently.",
          duties: [
            "Preside over and direct all the affairs of the Church",
            "Call General Authority Seventies, Area Seventies, and General Officers",
            "Approve the calling of bishops and stake presidency counselors",
          ],
          section: "5.1.1.1",
          under: "president",
          scriptures: ["D&C 107:22", "Matthew 17:1"],
        },
        {
          id: "twelve",
          title: "Quorum of the Twelve Apostles",
          tagline: "Special witnesses of Christ to all the world",
          summary:
            "Apostles act under the direction of the First Presidency to build up and regulate the Church in all nations. Each holds all the keys of the kingdom, exercised under the direction of the President of the Church, and serves for the rest of his life.",
          duties: [
            "Testify of Christ's divinity and Resurrection to all the world",
            "Build up and regulate the Church in all nations",
            "Direct the calling of stake patriarchs",
            "Lead the Church when the First Presidency is dissolved",
          ],
          section: "5.1.1.1",
          under: "first-presidency",
          scriptures: ["D&C 107:23", "Luke 6:13"],
        },
        {
          id: "seventy",
          title: "The Seventy",
          tagline: "Assist the Twelve throughout the world",
          summary:
            "Seventies act under the keys and direction of the Twelve. The Presidency of the Seventy — seven presidents — presides over all Seventies, who are organized into quorums. General Authority Seventies serve full-time and are generally granted emeritus status the year they turn 70.",
          duties: [
            "Bear witness of Jesus Christ and teach the gospel",
            "Help build up and regulate the Church in all nations",
            "Serve in Area Presidencies",
          ],
          calledBy: "The First Presidency",
          section: "5.1.1.2",
          under: "twelve",
          scriptures: ["D&C 107:25", "Luke 10:1"],
        },
        {
          id: "presiding-bishopric",
          title: "Presiding Bishopric",
          tagline: "Oversee the Church's temporal affairs",
          summary:
            "The Presiding Bishop and his two counselors are General Authorities who hold the office of bishop. Working under the First Presidency, they administer temporal matters for the entire Church.",
          duties: [
            "Oversee welfare and humanitarian efforts",
            "Administer Church finances and physical facilities",
            "Teach the gospel and build up the kingdom worldwide",
          ],
          calledBy: "The First Presidency",
          section: "5.1.1.3",
          under: "first-presidency",
          scriptures: ["D&C 107:68"],
        },
        {
          id: "general-officers",
          title: "General Officers",
          tagline: "General presidencies of the Church organizations",
          summary:
            "The First Presidency calls women and men to the general presidencies of the Relief Society, Young Men, Young Women, Primary, and Sunday School. They serve under the First Presidency, the Twelve, and assigned Seventies, typically for five years.",
          duties: [
            "Teach and testify of Jesus Christ",
            "Guide curriculum, programs, and resources for their organizations",
            "Minister to members throughout the world",
            "Instruct and support area organization advisers",
          ],
          calledBy: "The First Presidency",
          section: "5.1.2",
          under: "first-presidency",
        },
      ],
    },
    {
      id: "area",
      title: "Area Leadership",
      tagline: "Leaders over a geographic region of the world",
      summary:
        "The Church is organized into geographic areas covering the entire world. Area leaders apply general Church direction to the needs of their region and support stake, mission, and temple presidents.",
      section: "5.2",
      children: [
        {
          id: "area-presidency",
          title: "Area Presidency",
          tagline: "A Seventy and two counselors over an area",
          summary:
            "A General Authority Seventy serves as Area President with two counselors. They preside over and counsel with stake and mission presidents and support temple presidents and matrons.",
          duties: [
            "Apply general Church policy to the needs of the area",
            "Minister to and teach local leaders, missionaries, and members",
            "Preside at stake conferences as assigned",
            "Lead the area council",
          ],
          calledBy: "Assigned by the First Presidency and the Twelve",
          section: "5.2.1",
          under: "twelve",
        },
        {
          id: "area-seventies",
          title: "Area Seventies",
          tagline: "Local witnesses of Christ who help the Twelve",
          summary:
            "Area Seventies are not full-time; they usually serve about five years in the area where they live. Under the Area Presidency, they help build up and regulate the Church in their area and are sustained in general conference.",
          duties: [
            "Lead coordinating councils of stakes and missions",
            "Preside at stake conferences and instruct stake leaders",
            "Create or reorganize stakes and call stake presidencies",
            "Tour missions and instruct missionaries",
          ],
          calledBy: "The First Presidency",
          section: "5.2.2",
          under: "area-presidency",
        },
        {
          id: "mission-president",
          title: "Mission President",
          tagline: "Presides over full-time missionaries",
          summary:
            "The mission president serves under the Area Presidency. He holds the priesthood keys for baptizing and confirming converts in his mission, and he presides over member districts and branches where no stake exists.",
          duties: [
            "Lead and care for full-time missionaries",
            "Hold keys for convert baptisms and confirmations",
            "Preside over districts and branches outside of stakes",
          ],
          section: "5.2.1, 6.3, 18.7",
          under: "area-presidency",
          children: [
            {
              id: "full-time-missionaries",
              title: "Full-Time Missionaries",
              tagline: "Invite others to come unto Christ",
              summary:
                "Full-time missionaries teach the restored gospel, interview converts for baptism and confirmation, and work closely with ward members and leaders in weekly coordination meetings.",
              duties: [
                "Teach those learning about the gospel",
                "Interview converts for baptism",
                "Help strengthen new and returning members",
              ],
              section: "23.4, 31.2.3.2",
              under: "mission-president",
              scriptures: ["Matthew 28:19", "D&C 4:2"],
            },
          ],
        },
        {
          id: "area-advisers",
          title: "Area Organization Advisers",
          tagline: "Help orient new stake organization leaders",
          summary:
            "Outside the United States and Canada, Area Presidencies may call women as area organization advisers. Under stake presidencies' direction, they help orient new stake Relief Society, Young Women, and Primary presidencies.",
          calledBy: "The Area Presidency",
          section: "5.2.5.1",
          under: "area-presidency",
        },
      ],
    },
    {
      id: "stake",
      title: "Stake Leadership",
      tagline: "A gathering of several wards",
      summary:
        "Each stake is made up of multiple wards and is led by a stake president. The Lord establishes stakes for the gathering of His people and as a defense and refuge from the world.",
      section: "6.1",
      scriptures: ["Isaiah 54:2"],
      children: [
        {
          id: "stake-presidency",
          title: "Stake Presidency",
          tagline: "The stake president and his two counselors",
          summary:
            "The stake president holds the priesthood keys to lead the work of the Church in the stake. With his counselors, he cares for stake members with love and helps them become true followers of Jesus Christ.",
          duties: [
            "Serve as the presiding high priest in the stake",
            "Lead God's work of salvation and exaltation in the stake",
            "Serve as a common judge",
            "Oversee records, finances, and properties",
            "Instruct and support bishops",
          ],
          calledBy: "An assigned General Authority or Area Seventy",
          section: "6.2",
          under: "area-presidency",
          scriptures: ["D&C 115:6"],
        },
        {
          id: "high-council",
          title: "High Council",
          tagline: "Twelve high priests who help the stake presidency",
          summary:
            "The stake presidency calls 12 high priests to form the high council. High councilors represent the stake presidency in assigned wards and elders quorums, and all of them serve on the stake council.",
          duties: [
            "Represent the stake presidency in assigned wards",
            "Support elders quorums in their responsibilities",
            "Serve as stake Young Men and Sunday School presidents",
            "Speak in sacrament meetings when assigned",
          ],
          calledBy: "The stake presidency",
          section: "6.5",
          under: "stake-presidency",
          scriptures: ["D&C 102:1"],
        },
        {
          id: "patriarch",
          title: "Stake Patriarch",
          tagline: "Gives patriarchal blessings",
          summary:
            "A patriarch is an office in the Melchizedek Priesthood. He is called and ordained to give patriarchal blessings to worthy members. He should be mature in the gospel, sensitive to the Spirit, and normally age 55 or older.",
          calledBy: "Directed by the Quorum of the Twelve",
          section: "6.6",
          under: "stake-presidency",
          scriptures: ["D&C 107:39", "Genesis 49:28"],
        },
        {
          id: "stake-clerks",
          title: "Stake Executive Secretary & Clerks",
          tagline: "Support the presidency with schedules and records",
          summary:
            "The stake executive secretary schedules and coordinates for the stake presidency. The stake clerk, a member of the stake council, and his assistants keep stake records and finances.",
          calledBy: "The stake president or an assigned counselor",
          section: "6.4",
          under: "stake-presidency",
          scriptures: ["D&C 85:1"],
        },
        {
          id: "stake-organizations",
          title: "Stake Organization Presidencies",
          tagline: "Relief Society, Young Women, Young Men, Primary, Sunday School",
          summary:
            "Each stake organization is led by a president who serves under the stake presidency. Their main role is to assist the stake presidency and to instruct and support ward organization presidencies — not to create extra work for wards.",
          duties: [
            "Instruct and support ward organization leaders",
            "Counsel with the stake presidency about leaders' needs",
            "Occasionally plan stake activities",
          ],
          calledBy: "The stake presidency",
          section: "6.7",
          under: "stake-presidency",
        },
      ],
    },
    {
      id: "ward",
      title: "Ward Leadership",
      tagline: "The local congregation",
      summary:
        "The ward is where members gather each week to worship, learn, and serve. The bishop leads, and quorum and organization leaders help each member and family.",
      section: "7–13",
      children: [
        {
          id: "bishopric",
          title: "Bishopric",
          tagline: "The bishop and his two counselors",
          summary:
            "The bishop holds the priesthood keys to lead the work of the Church in the ward. His foremost responsibility is the rising generation — children, youth, and young single adults — so he delegates many assignments to others.",
          duties: [
            "Serve as the presiding high priest in the ward",
            "Preside over the Aaronic Priesthood and Young Women",
            "Serve as a common judge",
            "Coordinate God's work and care for those in need",
            "Oversee records, finances, and the meetinghouse",
          ],
          calledBy: "The stake president, with First Presidency approval",
          section: "7.1",
          under: "stake-presidency",
          scriptures: ["D&C 107:72", "D&C 46:27"],
          children: [
            {
              id: "ward-clerks",
              title: "Executive Secretary & Ward Clerks",
              tagline: "Schedule, record, and keep finances",
              summary:
                "The executive secretary works closely with the bishopric to schedule interviews and meetings but is not part of the bishopric. Ward clerks keep membership records and help with finances.",
              section: "7.3–7.4",
              under: "bishopric",
              scriptures: ["D&C 85:1"],
            },
          ],
        },
        {
          id: "ward-council",
          title: "Ward Council",
          tagline: "Leaders counseling together for the ward",
          summary:
            "The bishop leads the ward council and the ward youth council. Leaders counsel together about how to build spiritual strength and unity, and they coordinate God's work of salvation and exaltation in the ward.",
          section: "7.1.1.3, 29.2.5",
          under: "bishopric",
          scriptures: ["D&C 88:122"],
        },
        {
          id: "elders-quorum",
          title: "Elders Quorum",
          tagline: "Adult men who hold the Melchizedek Priesthood",
          summary:
            "Each ward has an elders quorum of elders, prospective elders, and most high priests. Members work together to serve others, fulfill priesthood duties, build unity, and learn and live doctrine.",
          duties: [
            "Organize ministering to individuals and families",
            "Help lead missionary and temple and family history work",
            "Help care for those in need",
          ],
          calledBy: "The stake president calls the elders quorum president",
          section: "8.1–8.3",
          under: "stake-presidency",
          scriptures: ["D&C 107:89", "D&C 20:38"],
        },
        {
          id: "relief-society",
          title: "Relief Society",
          tagline: "\"Charity never faileth\" — all adult women",
          summary:
            "Relief Society is a divinely instituted organization for all women 18 and older. Its purpose is to save souls and relieve suffering. Members serve others, fulfill covenant responsibilities, build unity, and learn and live doctrine.",
          duties: [
            "Organize ministering to individuals and families",
            "Help lead missionary and temple and family history work",
            "Help care for those in need",
          ],
          calledBy: "The bishop calls the Relief Society president",
          section: "9.1–9.3",
          under: "bishopric",
          scriptures: ["1 Corinthians 13:8", "Moroni 7:47"],
        },
        {
          id: "aaronic-priesthood",
          title: "Aaronic Priesthood Quorums",
          tagline: "Young men ages 12–18",
          summary:
            "Aaronic Priesthood quorums help young men make and keep sacred covenants and deepen their conversion to Jesus Christ. The bishopric is the presidency of the Aaronic Priesthood.",
          section: "10.1",
          under: "bishopric",
          scriptures: ["D&C 13:1", "D&C 107:20"],
          children: [
            {
              id: "deacons",
              title: "Deacons Quorum",
              tagline: "From January of the year they turn 12",
              summary:
                "Deacons pass the sacrament and assist the bishop in administering temporal things. An ordained deacon serves as quorum president and holds priesthood keys.",
              section: "10.1.3.1",
              under: "aaronic-priesthood",
              scriptures: ["D&C 20:59", "D&C 84:111"],
            },
            {
              id: "teachers",
              title: "Teachers Quorum",
              tagline: "From January of the year they turn 14",
              summary:
                "Teachers have the same duties as deacons. They also prepare the sacrament and serve as ministering brothers. An ordained teacher serves as quorum president.",
              section: "10.1.3.2",
              under: "aaronic-priesthood",
              scriptures: ["D&C 20:53"],
            },
            {
              id: "priests",
              title: "Priests Quorum",
              tagline: "From January of the year they turn 16",
              summary:
                "Priests have the same duties as deacons and teachers, with additional duties described in Doctrine and Covenants 20. The bishop is the president of the priests quorum and calls priests as his assistants.",
              section: "10.1.3.3",
              under: "aaronic-priesthood",
              scriptures: ["D&C 20:46", "D&C 107:87"],
            },
          ],
        },
        {
          id: "young-women",
          title: "Young Women",
          tagline: "Young women ages 12–18",
          summary:
            "The Young Women organization helps young women make and keep sacred covenants and deepen their conversion to Jesus Christ. Classes are organized by age-group, each led by a class presidency of young women.",
          duties: [
            "Serve others and fulfill covenant responsibilities",
            "Build unity and learn and live doctrine",
          ],
          calledBy: "The bishop calls the Young Women president",
          section: "11.1–11.3",
          under: "bishopric",
          scriptures: ["1 Timothy 4:12"],
        },
        {
          id: "primary",
          title: "Primary",
          tagline: "Children ages 18 months to 11",
          summary:
            "Primary helps children feel Heavenly Father's love, learn about Jesus Christ, recognize the Holy Ghost, and prepare to make and keep sacred covenants.",
          calledBy: "A member of the bishopric",
          section: "12.1–12.3",
          under: "bishopric",
          scriptures: ["3 Nephi 17:21", "3 Nephi 22:13"],
        },
        {
          id: "sunday-school",
          title: "Sunday School",
          tagline: "Learning and teaching the gospel",
          summary:
            "The Sunday School strengthens faith in Heavenly Father and Jesus Christ by teaching the doctrine of the kingdom. It supports home-centered gospel learning and helps members teach in the Savior's way.",
          calledBy: "A member of the bishopric",
          section: "13.1–13.2",
          under: "bishopric",
          scriptures: ["D&C 88:77"],
        },
        {
          id: "ward-mission-leader",
          title: "Ward Mission Leader",
          tagline: "Coordinates sharing the gospel",
          summary:
            "The ward mission leader supports the elders quorum and Relief Society presidencies in missionary work. If none is called, a member of the elders quorum presidency fills this role.",
          duties: [
            "Coordinate members, ward missionaries, and full-time missionaries",
            "Lead weekly coordination meetings",
            "Help strengthen new and returning members",
          ],
          section: "23.6.3",
          under: "bishopric",
          scriptures: ["D&C 18:15"],
          children: [
            {
              id: "ward-missionaries",
              title: "Ward Missionaries",
              tagline: "Help members share the gospel",
              summary:
                "Ward missionaries teach by word and example how to love others, share their faith, and invite others to receive the blessings of the gospel. They also help minister to new and returning members.",
              section: "23.6.4",
              under: "ward-mission-leader",
              scriptures: ["D&C 88:81"],
            },
          ],
        },
        {
          id: "tfh-leader",
          title: "Temple & Family History Leader",
          tagline: "Helps members gather ancestors",
          summary:
            "This leader supports the elders quorum and Relief Society presidencies in temple and family history work and instructs ward temple and family history consultants.",
          duties: [
            "Coordinate temple and family history efforts in the ward",
            "Conduct temple and family history coordination meetings",
            "Instruct consultants who help members find ancestors",
          ],
          section: "25.2.3",
          under: "bishopric",
          scriptures: ["Malachi 4:6", "D&C 128:15"],
        },
      ],
    },
    {
      id: "members",
      title: "Members & Families",
      tagline: "Where God's work is centered",
      summary:
        "Much of God's work of salvation and exaltation is accomplished through the family, and for all members this work is centered in the home. Church leaders and organizations exist to support individuals and families.",
      section: "2.0–2.3",
      children: [
        {
          id: "family",
          title: "Parents & Families",
          tagline: "The home is the center of gospel learning",
          summary:
            "Parents have the primary responsibility to teach their children the gospel. Families pray, learn the gospel together — including in home evening — and help one another keep covenants. Church activities support these efforts.",
          section: "2.1–2.2",
          under: "bishopric",
          scriptures: ["D&C 68:25"],
        },
        {
          id: "ministering",
          title: "Ministering Brothers & Sisters",
          tagline: "Watch over and care for one another",
          summary:
            "Ministering means serving others as the Savior did. Priesthood holders are assigned as ministering brothers to each household, and ministering sisters to each adult sister. Help with spiritual and temporal needs often begins with them.",
          section: "21.0, 22.6.3",
          under: "elders-quorum",
          scriptures: ["John 13:34"],
        },
        {
          id: "teachers-members",
          title: "Teachers",
          tagline: "Teach in the Savior's way",
          summary:
            "Parents, teachers, and leaders follow the example of Jesus Christ, the Master Teacher. They love those they teach, teach by the Spirit, and teach the doctrine from the scriptures and latter-day prophets.",
          section: "17.1",
          under: "sunday-school",
          scriptures: ["D&C 42:14"],
        },
        {
          id: "every-member",
          title: "Every Member",
          tagline: "Each has a role in God's work",
          summary:
            "Every member is invited to live the gospel, care for those in need, invite all to receive the gospel, and unite families for eternity — helping bring souls to Christ in their homes, callings, and communities.",
          section: "1.2, 1.4",
          under: "bishopric",
          scriptures: ["Mosiah 18:9"],
        },
      ],
    },
  ],
};
