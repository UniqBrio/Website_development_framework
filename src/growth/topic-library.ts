/**
 * DISCIPLINE TOPIC LIBRARY — what an academy in a given discipline can publish
 * and offer, as TEMPLATES filled from the academy's own facts.
 *
 * Why a library and not free generation: the brief forbids generic suggestions,
 * and the framework forbids invented facts. A template names the discipline, the
 * audience and (when known) the city — all read from the input — and carries a
 * fixed search intent and funnel stage, so every recommendation is specific AND
 * deterministic. Nothing here is a claim about the academy: a title is a topic to
 * write about, never a statement that the academy does something.
 *
 * Tier E (framework policy): the families and topics are editorial starting
 * points. They are NOT keyword research — search volume and difficulty are
 * recorded as unmeasured on every recommendation (README rule 10).
 *
 * Placeholders: {discipline} (as the academy writes it), {city}, {learner}
 * (singular learner noun), {learners}, {year} is deliberately absent — a dated
 * title goes stale and nothing re-dates it.
 */
import type { AcademyCategory, ResourceKind } from "./vocabulary.js";

export type SearchIntent = "informational" | "commercial" | "local" | "transactional";
export type TopicAudience = "parents" | "adult_beginners" | "students" | "all";
export type TopicStage = "awareness" | "consideration" | "decision";

export interface BlogTopicTemplate {
  /** Stable id within the family; part of the recommendation id. */
  id: string;
  title: string;
  primaryKeyword: string;
  secondaryKeywords: readonly string[];
  intent: SearchIntent;
  stage: TopicStage;
  audience: TopicAudience;
  /** Needs a known city to be written honestly (a local query). */
  needsCity: boolean;
  /** One sentence: what the reader gets — becomes the meta description seed. */
  readerValue: string;
  /** Which kind of page it should link to internally. */
  linksTo: "courses" | "trial" | "contact" | "events" | "resources";
}

export interface ResourceTemplate {
  id: string;
  kind: ResourceKind;
  title: string;
  why: string;
  audience: TopicAudience;
  primaryKeyword: string;
  secondaryKeywords: readonly string[];
}

export interface DisciplineFamily {
  id: string;
  category: AcademyCategory;
  label: string;
  /** Matched against discipline names, offer names and the sub-industry. */
  match: RegExp;
  learner: string;
  learners: string;
  blogTopics: readonly BlogTopicTemplate[];
  resources: readonly ResourceTemplate[];
  /** The skill dimensions a free self-assessment asks about. */
  assessmentDimensions: readonly string[];
  /**
   * A calculator only where a real, explainable formula exists for the discipline.
   * Null means a calculator would be invented maths — it is not recommended.
   */
  calculator: { title: string; inputs: readonly string[]; output: string } | null;
  practiceMaterial: string;
  sampleLesson: string;
  eventFormat: string;
}

// ------------------------------------------------------------------ shared topic sets

/** Topics every arts discipline shares, filled with the discipline's own name. */
function artsTopics(extra: readonly BlogTopicTemplate[]): BlogTopicTemplate[] {
  return [
    {
      id: "choose-class-child",
      title: "How to Choose the Right {discipline} Class for Your Child in {city}",
      primaryKeyword: "{discipline} classes for kids in {city}",
      secondaryKeywords: ["{discipline} classes near me", "best age to start {discipline}", "{discipline} academy {city}"],
      intent: "local",
      stage: "consideration",
      audience: "parents",
      needsCity: true,
      readerValue: "a parent's checklist for comparing {discipline} classes in {city}: teacher background, batch size, progression and trial options",
      linksTo: "trial",
    },
    {
      id: "best-age-to-start",
      title: "What Is the Best Age to Start Learning {discipline}?",
      primaryKeyword: "best age to start {discipline}",
      secondaryKeywords: ["{discipline} for kids", "can adults learn {discipline}", "{discipline} for beginners"],
      intent: "informational",
      stage: "awareness",
      audience: "parents",
      needsCity: false,
      readerValue: "what each age group can expect from {discipline} lessons, from early childhood to adult beginners",
      linksTo: "courses",
    },
    {
      id: "first-class-expect",
      title: "Your First {discipline} Class: What to Expect and What to Bring",
      primaryKeyword: "first {discipline} class",
      secondaryKeywords: ["{discipline} class for beginners", "what to wear for {discipline} class", "{discipline} beginner tips"],
      intent: "informational",
      stage: "decision",
      audience: "all",
      needsCity: false,
      readerValue: "a calm walkthrough of a first {discipline} lesson so new {learners} arrive prepared",
      linksTo: "trial",
    },
    {
      id: "adult-beginner",
      title: "Is It Too Late to Learn {discipline} as an Adult?",
      primaryKeyword: "learn {discipline} as an adult",
      secondaryKeywords: ["{discipline} classes for adults", "adult beginner {discipline}", "{discipline} for working professionals"],
      intent: "informational",
      stage: "awareness",
      audience: "adult_beginners",
      needsCity: false,
      readerValue: "honest expectations for adult {learners}: time commitment, progress and how to fit practice around work",
      linksTo: "courses",
    },
    {
      id: "practice-at-home",
      title: "How to Practise {discipline} at Home Between Classes",
      primaryKeyword: "{discipline} practice at home",
      secondaryKeywords: ["{discipline} practice routine", "{discipline} exercises for beginners", "how often to practise {discipline}"],
      intent: "informational",
      stage: "awareness",
      audience: "students",
      needsCity: false,
      readerValue: "a short, repeatable home practice routine that complements weekly {discipline} lessons",
      linksTo: "resources",
    },
    {
      id: "local-classes-guide",
      title: "{discipline} Classes in {city}: A Guide to Batches, Levels and Timings",
      primaryKeyword: "{discipline} classes in {city}",
      secondaryKeywords: ["{discipline} academy near me", "{discipline} weekend classes {city}", "{discipline} teacher {city}"],
      intent: "local",
      stage: "decision",
      audience: "all",
      needsCity: true,
      readerValue: "how {discipline} batches, levels and timings typically work in {city}, and how to pick one",
      linksTo: "contact",
    },
    ...extra,
  ];
}

/** Topics every sports discipline shares. */
function sportsTopics(extra: readonly BlogTopicTemplate[]): BlogTopicTemplate[] {
  return [
    {
      id: "choose-coaching-child",
      title: "How to Choose the Right {discipline} Coaching for Your Child in {city}",
      primaryKeyword: "{discipline} coaching for kids in {city}",
      secondaryKeywords: ["{discipline} coaching near me", "{discipline} academy {city}", "best age to start {discipline}"],
      intent: "local",
      stage: "consideration",
      audience: "parents",
      needsCity: true,
      readerValue: "a parent's checklist for comparing {discipline} coaching in {city}: coach credentials, player-to-coach ratio, facilities and safety",
      linksTo: "trial",
    },
    {
      id: "beginner-skills",
      title: "{discipline} for Beginners: The First Skills Every {learner} Should Learn",
      primaryKeyword: "{discipline} for beginners",
      secondaryKeywords: ["{discipline} basics", "{discipline} beginner drills", "how to start {discipline}"],
      intent: "informational",
      stage: "awareness",
      audience: "all",
      needsCity: false,
      readerValue: "the fundamental {discipline} skills a new {learner} builds first, and why the order matters",
      linksTo: "courses",
    },
    {
      id: "first-session-expect",
      title: "Your First {discipline} Coaching Session: What to Expect and What to Bring",
      primaryKeyword: "first {discipline} coaching session",
      secondaryKeywords: ["{discipline} kit for beginners", "{discipline} trial session", "{discipline} coaching for beginners"],
      intent: "informational",
      stage: "decision",
      audience: "all",
      needsCity: false,
      readerValue: "what happens in a first {discipline} session, the kit to bring, and how to prepare a child for it",
      linksTo: "trial",
    },
    {
      id: "injury-prevention",
      title: "Warm-Ups and Injury Prevention for Young {learners}",
      primaryKeyword: "{discipline} warm up exercises",
      secondaryKeywords: ["{discipline} injury prevention", "{discipline} stretching routine", "{discipline} fitness for kids"],
      intent: "informational",
      stage: "awareness",
      audience: "parents",
      needsCity: false,
      readerValue: "a safe warm-up routine and the common {discipline} injuries good coaching helps prevent",
      linksTo: "resources",
    },
    {
      id: "training-schedule",
      title: "How Many Hours a Week Should a Young {learner} Train?",
      primaryKeyword: "{discipline} training schedule for kids",
      secondaryKeywords: ["{discipline} practice hours", "{discipline} training plan", "balancing {discipline} and school"],
      intent: "informational",
      stage: "consideration",
      audience: "parents",
      needsCity: false,
      readerValue: "age-appropriate weekly training volumes for {discipline}, and how to balance them with school",
      linksTo: "courses",
    },
    {
      id: "local-coaching-guide",
      title: "{discipline} Coaching in {city}: Batches, Levels and Facilities Explained",
      primaryKeyword: "{discipline} coaching in {city}",
      secondaryKeywords: ["{discipline} academy near me", "{discipline} summer camp {city}", "{discipline} coach {city}"],
      intent: "local",
      stage: "decision",
      audience: "all",
      needsCity: true,
      readerValue: "how {discipline} coaching batches, levels and facilities typically work in {city}, and how to choose",
      linksTo: "contact",
    },
    ...extra,
  ];
}

function resourceSet(category: AcademyCategory, extra: readonly ResourceTemplate[]): ResourceTemplate[] {
  const course: ResourceTemplate = {
    id: "course-guide",
    kind: "course_guide",
    title: category === "arts" ? "{discipline} Course Guide: Levels, Syllabus and Progression" : "{discipline} Coaching Pathway: Levels, Skills and Progression",
    why: "visitors comparing academies want to see how a learner progresses before they enquire; a published pathway answers the question competitors leave to a phone call",
    audience: "parents",
    primaryKeyword: category === "arts" ? "{discipline} syllabus for beginners" : "{discipline} coaching levels",
    secondaryKeywords: ["{discipline} course levels", "{discipline} progression"],
  };
  const faq: ResourceTemplate = {
    id: "faq",
    kind: "faq",
    title: category === "arts" ? "{discipline} Classes: Frequently Asked Questions" : "{discipline} Coaching: Frequently Asked Questions",
    why: "parents ask the same pre-enrolment questions (age, timings, fees structure, trial, kit); an FAQ answers them on the page and can carry FAQPage structured data once the answers are verified",
    audience: "parents",
    primaryKeyword: category === "arts" ? "{discipline} classes faq" : "{discipline} coaching faq",
    secondaryKeywords: category === "arts" ? ["{discipline} class fees", "{discipline} class timings"] : ["{discipline} coaching fees", "{discipline} coaching timings"],
  };
  const beginner: ResourceTemplate = {
    id: "beginner-guide",
    kind: "beginner_guide",
    title: "The Complete Beginner's Guide to {discipline}",
    why: "a beginner guide ranks for awareness-stage searches and gives a first-time visitor a reason to stay and return",
    audience: "all",
    primaryKeyword: "{discipline} beginner guide",
    secondaryKeywords: ["how to learn {discipline}", "{discipline} for beginners"],
  };
  return [course, beginner, faq, ...extra];
}

// ------------------------------------------------------------------ families

export const DISCIPLINE_FAMILIES: readonly DisciplineFamily[] = [
  {
    id: "dance",
    category: "arts",
    label: "Dance",
    match: /danc|bharatanatyam|kathak|kuchipudi|odissi|mohiniyattam|manipuri|ballet|salsa|hip[\s-]?hop|contemporary|zumba|bollywood|tap\b|jazz dance|garba|bhangra/i,
    learner: "dancer",
    learners: "dancers",
    blogTopics: artsTopics([
      {
        id: "exam-grades",
        title: "{discipline} Grade Exams Explained: Levels, Syllabus and Preparation",
        primaryKeyword: "{discipline} exam grades",
        secondaryKeywords: ["{discipline} certification", "{discipline} syllabus levels", "{discipline} exam preparation"],
        intent: "informational",
        stage: "consideration",
        audience: "parents",
        needsCity: false,
        readerValue: "how graded {discipline} exams work and how a structured syllabus supports steady progress",
        linksTo: "courses",
      },
      {
        id: "performance-prep",
        title: "Preparing for Your First {discipline} Performance or Recital",
        primaryKeyword: "{discipline} performance tips",
        secondaryKeywords: ["{discipline} stage fright", "{discipline} recital preparation"],
        intent: "informational",
        stage: "awareness",
        audience: "students",
        needsCity: false,
        readerValue: "practical preparation steps for a first {discipline} performance, from rehearsal to costume",
        linksTo: "events",
      },
    ]),
    resources: resourceSet("arts", [
      {
        id: "practice-chart",
        kind: "practice_material",
        title: "Printable {discipline} Weekly Practice Chart",
        why: "a printable chart is a reason to download and return, and it turns a passive visitor into a learner practising with the academy's method",
        audience: "students",
        primaryKeyword: "{discipline} practice chart",
        secondaryKeywords: ["{discipline} practice routine printable"],
      },
      {
        id: "glossary",
        kind: "reference_sheet",
        title: "{discipline} Terms and Steps: A Beginner's Glossary",
        why: "a glossary of steps and terms ranks for many long-tail 'what is …' searches and supports every other page through internal links",
        audience: "all",
        primaryKeyword: "{discipline} terms for beginners",
        secondaryKeywords: ["{discipline} steps names", "{discipline} glossary"],
      },
    ]),
    assessmentDimensions: ["rhythm and timing", "posture and balance", "flexibility", "memory for sequences", "expression"],
    calculator: null,
    practiceMaterial: "{discipline} warm-up and basic steps practice sheet",
    sampleLesson: "a short recorded {discipline} beginner lesson",
    eventFormat: "an introductory {discipline} workshop or open recital",
  },
  {
    id: "music",
    category: "arts",
    label: "Music",
    match: /music|vocal|singing|sing\b|carnatic|hindustani|guitar|piano|keyboard|violin|veena|sitar|tabla|mridangam|flute|drum|ukulele|cello|harmonium|saxophone/i,
    learner: "musician",
    learners: "musicians",
    blogTopics: artsTopics([
      {
        id: "instrument-choice",
        title: "Which Instrument Should Your Child Learn First? A {discipline} Teacher's View",
        primaryKeyword: "which instrument should my child learn",
        secondaryKeywords: ["{discipline} lessons for kids", "{discipline} for beginners", "best instrument for beginners"],
        intent: "informational",
        stage: "consideration",
        audience: "parents",
        needsCity: false,
        readerValue: "how to match a first instrument to a child's age, temperament and practice time",
        linksTo: "courses",
      },
      {
        id: "music-exams",
        title: "{discipline} Grade Exams: How Graded Music Exams Work and When to Start",
        primaryKeyword: "{discipline} grade exams",
        secondaryKeywords: ["music exam preparation", "{discipline} certification", "{discipline} syllabus"],
        intent: "informational",
        stage: "consideration",
        audience: "parents",
        needsCity: false,
        readerValue: "how graded {discipline} exams are structured and how to tell when a learner is ready",
        linksTo: "courses",
      },
    ]),
    resources: resourceSet("arts", [
      {
        id: "practice-log",
        kind: "practice_material",
        title: "Printable {discipline} Practice Log and Daily Warm-Up Routine",
        why: "a practice log gives learners a reason to download and return, and makes steady practice visible to parents",
        audience: "students",
        primaryKeyword: "{discipline} practice log",
        secondaryKeywords: ["{discipline} daily practice routine", "{discipline} warm up"],
      },
      {
        id: "theory-sheet",
        kind: "reference_sheet",
        title: "{discipline} Basics Reference Sheet for Beginners",
        why: "a one-page reference of basics (notes, scales or swaras, rhythm patterns) ranks for long-tail beginner searches and is shared between learners",
        audience: "students",
        primaryKeyword: "{discipline} basics for beginners",
        secondaryKeywords: ["{discipline} notes chart", "{discipline} theory basics"],
      },
    ]),
    assessmentDimensions: ["pitch and ear", "rhythm", "reading or notation", "technique", "practice habit"],
    calculator: { title: "{discipline} practice-time planner", inputs: ["days available per week", "minutes per day", "current level"], output: "a weekly practice split across warm-up, technique and repertoire" },
    practiceMaterial: "{discipline} daily warm-up and exercise sheet",
    sampleLesson: "a short recorded {discipline} beginner lesson",
    eventFormat: "an open {discipline} recital or introductory masterclass",
  },
  {
    id: "visual_art",
    category: "arts",
    label: "Visual art",
    match: /art\b|arts\b|drawing|painting|sketch|watercolou?r|acrylic|oil paint|pottery|ceramic|sculpt|craft|calligraphy|animation|illustration|madhubani|warli|photograph/i,
    learner: "artist",
    learners: "artists",
    blogTopics: artsTopics([
      {
        id: "materials-starter",
        title: "Starter Materials for {discipline}: What Beginners Really Need",
        primaryKeyword: "{discipline} materials for beginners",
        secondaryKeywords: ["{discipline} supplies list", "{discipline} kit for kids"],
        intent: "commercial",
        stage: "consideration",
        audience: "all",
        needsCity: false,
        readerValue: "a short, budget-conscious list of the {discipline} materials a beginner needs — and what can wait",
        linksTo: "courses",
      },
      {
        id: "creativity-benefits",
        title: "How {discipline} Classes Build Focus and Creativity in Children",
        primaryKeyword: "benefits of {discipline} classes for kids",
        secondaryKeywords: ["{discipline} for child development", "art classes for kids benefits"],
        intent: "informational",
        stage: "awareness",
        audience: "parents",
        needsCity: false,
        readerValue: "what structured {discipline} classes develop in children beyond the artwork itself",
        linksTo: "courses",
      },
    ]),
    resources: resourceSet("arts", [
      {
        id: "practice-sheets",
        kind: "practice_material",
        title: "Free {discipline} Practice Sheets for Beginners",
        why: "printable practice sheets are among the most downloaded free resources for beginners and bring repeat visits",
        audience: "students",
        primaryKeyword: "{discipline} practice sheets",
        secondaryKeywords: ["{discipline} worksheets for kids", "{discipline} exercises printable"],
      },
      {
        id: "supplies-checklist",
        kind: "checklist",
        title: "{discipline} Beginner Supplies Checklist",
        why: "a supplies checklist answers a high-frequency pre-enrolment question and is easy to keep current",
        audience: "parents",
        primaryKeyword: "{discipline} supplies checklist",
        secondaryKeywords: ["{discipline} materials list"],
      },
    ]),
    assessmentDimensions: ["observation", "line control", "colour sense", "composition", "patience and focus"],
    calculator: null,
    practiceMaterial: "{discipline} warm-up exercise sheets",
    sampleLesson: "a short recorded {discipline} demonstration",
    eventFormat: "a {discipline} open studio or weekend workshop",
  },
  {
    id: "theatre",
    category: "arts",
    label: "Theatre and speech",
    match: /theat|drama|acting|speech|elocution|public speaking|improv|voice/i,
    learner: "performer",
    learners: "performers",
    blogTopics: artsTopics([
      {
        id: "confidence",
        title: "How {discipline} Classes Build Confidence in Shy Children",
        primaryKeyword: "{discipline} classes for confidence",
        secondaryKeywords: ["{discipline} for kids benefits", "stage confidence for children"],
        intent: "informational",
        stage: "awareness",
        audience: "parents",
        needsCity: false,
        readerValue: "how {discipline} exercises help children speak and perform with confidence",
        linksTo: "courses",
      },
    ]),
    resources: resourceSet("arts", [
      {
        id: "warmups",
        kind: "practice_material",
        title: "{discipline} Voice and Body Warm-Up Card",
        why: "a printable warm-up card is useful every week, so it brings learners back to the site",
        audience: "students",
        primaryKeyword: "{discipline} warm up exercises",
        secondaryKeywords: ["voice warm up for kids"],
      },
    ]),
    assessmentDimensions: ["voice projection", "expression", "memory for lines", "confidence on stage", "listening"],
    calculator: null,
    practiceMaterial: "{discipline} voice and body warm-up card",
    sampleLesson: "a short recorded {discipline} exercise session",
    eventFormat: "an introductory {discipline} workshop or showcase",
  },
  {
    id: "cricket",
    category: "sports",
    label: "Cricket",
    match: /cricket/i,
    learner: "cricketer",
    learners: "cricketers",
    blogTopics: sportsTopics([
      {
        id: "batting-drills",
        title: "Five Batting Drills Young Cricketers Can Practise at Home",
        primaryKeyword: "cricket batting drills at home",
        secondaryKeywords: ["cricket practice at home", "batting tips for kids", "cricket drills for beginners"],
        intent: "informational",
        stage: "awareness",
        audience: "students",
        needsCity: false,
        readerValue: "safe home batting drills that reinforce what young players learn in nets",
        linksTo: "resources",
      },
      {
        id: "kit-guide",
        title: "Cricket Kit for Beginners: What a Young Player Needs (and What Can Wait)",
        primaryKeyword: "cricket kit for beginners",
        secondaryKeywords: ["cricket bat size for kids", "cricket kit list"],
        intent: "commercial",
        stage: "consideration",
        audience: "parents",
        needsCity: false,
        readerValue: "a sizing and safety guide to beginner cricket kit, so parents buy the right items once",
        linksTo: "courses",
      },
    ]),
    resources: resourceSet("sports", [
      {
        id: "bat-size",
        kind: "reference_sheet",
        title: "Cricket Bat Size Chart by Age and Height",
        why: "bat sizing is a frequent parent search with clear reference value, and it links naturally to the academy's beginner batches",
        audience: "parents",
        primaryKeyword: "cricket bat size chart",
        secondaryKeywords: ["cricket bat size for kids"],
      },
      {
        id: "drill-plan",
        kind: "practice_material",
        title: "Printable 4-Week Home Cricket Drill Plan",
        why: "a structured drill plan is a reason to download and return between sessions",
        audience: "students",
        primaryKeyword: "cricket practice plan",
        secondaryKeywords: ["cricket drills printable"],
      },
    ]),
    assessmentDimensions: ["batting technique", "bowling action", "fielding and catching", "fitness", "game awareness"],
    calculator: { title: "Cricket bat size finder", inputs: ["player height", "player age"], output: "a recommended bat size from a published size chart" },
    practiceMaterial: "cricket home drill plan",
    sampleLesson: "a short recorded cricket nets session",
    eventFormat: "a cricket summer camp or open trial day",
  },
  {
    id: "football",
    category: "sports",
    label: "Football",
    match: /football|soccer|futsal/i,
    learner: "player",
    learners: "players",
    blogTopics: sportsTopics([
      {
        id: "ball-skills",
        title: "Ball Control Drills Young Football Players Can Do at Home",
        primaryKeyword: "football drills at home for kids",
        secondaryKeywords: ["football ball control drills", "football practice at home", "football skills for beginners"],
        intent: "informational",
        stage: "awareness",
        audience: "students",
        needsCity: false,
        readerValue: "space-friendly ball-control drills that build touch between training sessions",
        linksTo: "resources",
      },
    ]),
    resources: resourceSet("sports", [
      {
        id: "drill-plan",
        kind: "practice_material",
        title: "Printable Home Football Skills Plan",
        why: "a skills plan gives players and parents a reason to download and return between sessions",
        audience: "students",
        primaryKeyword: "football training plan for kids",
        secondaryKeywords: ["football drills printable"],
      },
    ]),
    assessmentDimensions: ["ball control", "passing", "shooting", "speed and agility", "teamwork"],
    calculator: null,
    practiceMaterial: "football home skills plan",
    sampleLesson: "a short recorded football skills session",
    eventFormat: "a football open trial day or holiday camp",
  },
  {
    id: "racket",
    category: "sports",
    label: "Racket sports",
    match: /badminton|tennis|table tennis|squash|pickleball|padel/i,
    learner: "player",
    learners: "players",
    blogTopics: sportsTopics([
      {
        id: "racket-choice",
        title: "Choosing a First {discipline} Racket for a Child",
        primaryKeyword: "{discipline} racket for beginners",
        secondaryKeywords: ["{discipline} racket size for kids", "{discipline} equipment for beginners"],
        intent: "commercial",
        stage: "consideration",
        audience: "parents",
        needsCity: false,
        readerValue: "how racket weight, grip and size affect a young {learner}'s technique, and what to buy first",
        linksTo: "courses",
      },
    ]),
    resources: resourceSet("sports", [
      {
        id: "footwork",
        kind: "practice_material",
        title: "{discipline} Footwork Drills: A Printable Practice Card",
        why: "footwork is the skill beginners practise least on their own; a drill card makes it practical at home",
        audience: "students",
        primaryKeyword: "{discipline} footwork drills",
        secondaryKeywords: ["{discipline} practice at home"],
      },
    ]),
    assessmentDimensions: ["footwork", "grip and stroke technique", "serve", "court awareness", "stamina"],
    calculator: null,
    practiceMaterial: "{discipline} footwork drill card",
    sampleLesson: "a short recorded {discipline} technique session",
    eventFormat: "a {discipline} open court day or junior tournament",
  },
  {
    id: "swimming",
    category: "sports",
    label: "Swimming",
    match: /swim|aquatic/i,
    learner: "swimmer",
    learners: "swimmers",
    blogTopics: sportsTopics([
      {
        id: "water-confidence",
        title: "How to Help a Nervous Child Feel Confident in the Water",
        primaryKeyword: "swimming lessons for nervous child",
        secondaryKeywords: ["water confidence for kids", "fear of water children", "beginner swimming lessons"],
        intent: "informational",
        stage: "consideration",
        audience: "parents",
        needsCity: false,
        readerValue: "gentle steps parents and coaches use to build water confidence before strokes",
        linksTo: "trial",
      },
    ]),
    resources: resourceSet("sports", [
      {
        id: "safety-checklist",
        kind: "checklist",
        title: "Pool Safety Checklist for Parents of Young Swimmers",
        why: "safety is the first concern of parents choosing swimming lessons; a checklist answers it and builds trust",
        audience: "parents",
        primaryKeyword: "swimming safety tips for kids",
        secondaryKeywords: ["pool safety checklist"],
      },
    ]),
    assessmentDimensions: ["water confidence", "floating and breathing", "stroke technique", "endurance", "water safety"],
    calculator: { title: "Swim pace calculator", inputs: ["distance swum", "time taken"], output: "pace per 100 m from the swimmer's own numbers" },
    practiceMaterial: "dry-land swimming exercise sheet",
    sampleLesson: "a short recorded beginner swimming lesson",
    eventFormat: "a learn-to-swim open session or holiday camp",
  },
  {
    id: "martial_arts",
    category: "sports",
    label: "Martial arts",
    match: /karate|taekwondo|judo|kung ?fu|martial|kalaripayattu|silambam|boxing|kickbox|mma|aikido|jiu[\s-]?jitsu|wushu/i,
    learner: "student",
    learners: "students",
    blogTopics: sportsTopics([
      {
        id: "belts",
        title: "{discipline} Belt Levels Explained for Parents",
        primaryKeyword: "{discipline} belt levels",
        secondaryKeywords: ["{discipline} belt order", "{discipline} grading", "how long to get black belt in {discipline}"],
        intent: "informational",
        stage: "consideration",
        audience: "parents",
        needsCity: false,
        readerValue: "how {discipline} gradings work, what each belt means and how long progression usually takes",
        linksTo: "courses",
      },
      {
        id: "self-defence",
        title: "{discipline} and Self-Defence: What Children Really Learn",
        primaryKeyword: "{discipline} for self defence kids",
        secondaryKeywords: ["{discipline} benefits for kids", "self defence classes for children"],
        intent: "informational",
        stage: "awareness",
        audience: "parents",
        needsCity: false,
        readerValue: "the discipline, confidence and safety habits children build in {discipline} — beyond the techniques",
        linksTo: "trial",
      },
    ]),
    resources: resourceSet("sports", [
      {
        id: "grading-checklist",
        kind: "checklist",
        title: "{discipline} Grading Preparation Checklist",
        why: "a grading checklist is used before every grading, so it brings families back to the site repeatedly",
        audience: "students",
        primaryKeyword: "{discipline} grading preparation",
        secondaryKeywords: ["{discipline} belt test tips"],
      },
    ]),
    assessmentDimensions: ["stance and balance", "flexibility", "technique", "discipline and focus", "fitness"],
    calculator: null,
    practiceMaterial: "{discipline} home practice routine",
    sampleLesson: "a short recorded {discipline} beginner class",
    eventFormat: "a {discipline} self-defence workshop or open class",
  },
  {
    id: "yoga_fitness",
    category: "sports",
    label: "Yoga and fitness",
    match: /yoga|fitness|gym|athletic|running|pilates|aerobic|crossfit|gymnastic|calisthenic|skating/i,
    learner: "member",
    learners: "members",
    blogTopics: sportsTopics([
      {
        id: "routine-beginners",
        title: "A 15-Minute {discipline} Routine for Complete Beginners",
        primaryKeyword: "{discipline} routine for beginners",
        secondaryKeywords: ["{discipline} at home", "{discipline} for beginners", "{discipline} daily routine"],
        intent: "informational",
        stage: "awareness",
        audience: "adult_beginners",
        needsCity: false,
        readerValue: "a short, safe {discipline} routine a beginner can follow at home before joining a class",
        linksTo: "trial",
      },
    ]),
    resources: resourceSet("sports", [
      {
        id: "weekly-plan",
        kind: "schedule_template",
        title: "Printable 4-Week Beginner {discipline} Plan",
        why: "a structured plan is a reason to download and return, and leads naturally to a trial class",
        audience: "adult_beginners",
        primaryKeyword: "{discipline} plan for beginners",
        secondaryKeywords: ["{discipline} weekly plan printable"],
      },
    ]),
    assessmentDimensions: ["mobility", "strength", "balance", "endurance", "consistency"],
    calculator: { title: "Weekly training-time planner", inputs: ["sessions per week", "minutes per session"], output: "total weekly training time against the plan the learner chooses" },
    practiceMaterial: "{discipline} beginner routine card",
    sampleLesson: "a short recorded {discipline} beginner session",
    eventFormat: "a {discipline} open community session",
  },
  {
    id: "chess",
    category: "sports",
    label: "Chess",
    match: /chess/i,
    learner: "player",
    learners: "players",
    blogTopics: sportsTopics([
      {
        id: "openings",
        title: "Chess Openings Every Beginner Should Learn First",
        primaryKeyword: "chess openings for beginners",
        secondaryKeywords: ["best chess openings for kids", "how to start a chess game", "chess tips for beginners"],
        intent: "informational",
        stage: "awareness",
        audience: "students",
        needsCity: false,
        readerValue: "a short set of sound opening principles and lines that beginners can use from their next game",
        linksTo: "resources",
      },
      {
        id: "rating",
        title: "How Chess Ratings Work: A Parent's Guide to Tournaments and FIDE Ratings",
        primaryKeyword: "how chess rating works",
        secondaryKeywords: ["chess tournaments for kids", "fide rating for beginners"],
        intent: "informational",
        stage: "consideration",
        audience: "parents",
        needsCity: false,
        readerValue: "how ratings and junior tournaments work, and when a child is ready to play rated games",
        linksTo: "events",
      },
    ]),
    resources: resourceSet("sports", [
      {
        id: "puzzles",
        kind: "practice_material",
        title: "Free Printable Chess Puzzles for Beginners",
        why: "puzzle sheets are a repeat-visit resource and are shared between parents and schools",
        audience: "students",
        primaryKeyword: "chess puzzles for beginners",
        secondaryKeywords: ["chess puzzles printable", "chess worksheets for kids"],
      },
    ]),
    assessmentDimensions: ["piece movement and rules", "tactics", "openings", "endgames", "concentration"],
    calculator: null,
    practiceMaterial: "chess puzzle sheets",
    sampleLesson: "a short recorded chess beginner lesson",
    eventFormat: "a beginner chess tournament or simultaneous exhibition",
  },
];

/** The fallback families when a discipline matches no specific family. Still discipline-named. */
export const GENERIC_FAMILIES: Readonly<Record<AcademyCategory, DisciplineFamily>> = {
  arts: {
    id: "arts_general",
    category: "arts",
    label: "Arts",
    match: /$^/,
    learner: "learner",
    learners: "learners",
    blogTopics: artsTopics([]),
    resources: resourceSet("arts", []),
    assessmentDimensions: ["foundations", "technique", "practice habit", "confidence"],
    calculator: null,
    practiceMaterial: "{discipline} beginner practice sheet",
    sampleLesson: "a short recorded {discipline} beginner lesson",
    eventFormat: "an introductory {discipline} workshop",
  },
  sports: {
    id: "sports_general",
    category: "sports",
    label: "Sports",
    match: /$^/,
    learner: "player",
    learners: "players",
    blogTopics: sportsTopics([]),
    resources: resourceSet("sports", []),
    assessmentDimensions: ["fundamental skills", "fitness", "game awareness", "practice habit"],
    calculator: null,
    practiceMaterial: "{discipline} home drill plan",
    sampleLesson: "a short recorded {discipline} coaching session",
    eventFormat: "a {discipline} open trial day or holiday camp",
  },
};

/** The family a discipline name belongs to, or null when it matches none. */
export function familyFor(discipline: string): DisciplineFamily | null {
  return DISCIPLINE_FAMILIES.find((f) => f.match.test(discipline)) ?? null;
}

/** Fill `{discipline}`, `{city}`, `{learner}`, `{learners}`. An unfilled `{city}` throws: callers must check `needsCity`. */
export function fillTemplate(
  template: string,
  values: { discipline: string; city: string | null; learner: string; learners: string },
): string {
  if (template.includes("{city}") && !values.city) {
    throw new Error(`template needs a city: ${template}`);
  }
  return template
    .replace(/\{discipline\}/g, values.discipline)
    .replace(/\{city\}/g, values.city ?? "")
    .replace(/\{learners\}/g, values.learners)
    .replace(/\{learner\}/g, values.learner);
}
