// Job Finder listings — MANAGED BY THE ADMIN DASHBOARD (/admin/ → Job Finder).
// Prefer editing there: it validates every change and publishes it for you. If a
// developer edits this file by hand, everything between the CMS-DATA markers must
// stay valid JSON (double-quoted keys, no trailing commas).
//
// isSampleData: true  -> an illustrative example, shown with a "Sample" badge.
// isSampleData: false -> a real opening; must include sourceUrl (the original posting)
//                        and should include lastVerified (YYYY-MM-DD).
//
// To wire up a real feed later (e.g. USAJOBS.gov's free API,
// https://developer.usajobs.gov/), replace this list with fetched data.

const SAMPLE_JOBS = /* CMS-DATA-START */ [
  {
    "id": "job-1",
    "title": "Aerospace Engineer I – Structures",
    "company": "Skyline Aerospace (sample)",
    "fieldId": "aerospace-engineering",
    "experienceLevel": "new-grad",
    "location": "Seattle, WA",
    "remote": false,
    "description": "Support structural analysis and CAD modeling for a satellite bus program under senior engineer guidance.",
    "isSampleData": true
  },
  {
    "id": "job-2",
    "title": "Aerospace Systems Intern",
    "company": "Skyline Aerospace (sample)",
    "fieldId": "aerospace-engineering",
    "experienceLevel": "internship",
    "location": "Remote",
    "remote": true,
    "description": "Support systems engineering documentation and trade studies for a small satellite program.",
    "isSampleData": true
  },
  {
    "id": "job-3",
    "title": "Mechanical Design Intern",
    "company": "Northgate Manufacturing (sample)",
    "fieldId": "mechanical-engineering",
    "experienceLevel": "internship",
    "location": "Austin, TX",
    "remote": false,
    "description": "Assist with SolidWorks modeling and prototype testing for a consumer robotics product line.",
    "isSampleData": true
  },
  {
    "id": "job-4",
    "title": "Structural EIT",
    "company": "BuildRight Civil Group (sample)",
    "fieldId": "civil-engineering",
    "experienceLevel": "new-grad",
    "location": "Denver, CO",
    "remote": false,
    "description": "Perform calculations and drafting for bridge and roadway projects while studying for the FE exam.",
    "isSampleData": true
  },
  {
    "id": "job-5",
    "title": "Electrical Design Engineer",
    "company": "Voltaic Power Systems (sample)",
    "fieldId": "electrical-engineering",
    "experienceLevel": "1-3-years",
    "location": "Austin, TX",
    "remote": false,
    "description": "Design and validate power distribution circuits for EV charging hardware.",
    "isSampleData": true
  },
  {
    "id": "job-6",
    "title": "Software Engineer I",
    "company": "Brightloop Technologies (sample)",
    "fieldId": "computer-science-software-engineering",
    "experienceLevel": "new-grad",
    "location": "Remote",
    "remote": true,
    "description": "Build and test features for a cloud-based analytics dashboard used by enterprise customers.",
    "isSampleData": true
  },
  {
    "id": "job-7",
    "title": "Backend Engineer, Platform",
    "company": "Brightloop Technologies (sample)",
    "fieldId": "computer-science-software-engineering",
    "experienceLevel": "1-3-years",
    "location": "San Francisco, CA",
    "remote": true,
    "description": "Own service reliability and API design for the company's core data platform.",
    "isSampleData": true
  },
  {
    "id": "job-8",
    "title": "Process Engineer I",
    "company": "Meridian Chemical Co. (sample)",
    "fieldId": "chemical-engineering",
    "experienceLevel": "new-grad",
    "location": "Houston, TX",
    "remote": false,
    "description": "Monitor plant process data and support HAZOP reviews at a specialty chemicals facility.",
    "isSampleData": true
  },
  {
    "id": "job-9",
    "title": "Data Scientist I",
    "company": "Northlake Analytics (sample)",
    "fieldId": "data-science-statistics",
    "experienceLevel": "new-grad",
    "location": "Remote",
    "remote": true,
    "description": "Build dashboards and basic forecasting models for a retail demand-planning team.",
    "isSampleData": true
  },
  {
    "id": "job-10",
    "title": "R&D Engineer I, Medical Devices",
    "company": "Vantage MedTech (sample)",
    "fieldId": "biomedical-engineering",
    "experienceLevel": "new-grad",
    "location": "Minneapolis, MN",
    "remote": false,
    "description": "Support prototyping and design-verification testing for a cardiac monitoring device.",
    "isSampleData": true
  },
  {
    "id": "job-11",
    "title": "Research Associate I",
    "company": "Helix Bio Labs (sample)",
    "fieldId": "biotechnology-pharmaceutical-sciences",
    "experienceLevel": "new-grad",
    "location": "Cambridge, MA",
    "remote": false,
    "description": "Run established cell-culture and assay protocols under direct supervision in a therapeutics lab.",
    "isSampleData": true
  },
  {
    "id": "job-12",
    "title": "Epidemiologist I",
    "company": "Riverside County Public Health (sample)",
    "fieldId": "public-health-epidemiology",
    "experienceLevel": "new-grad",
    "location": "Sacramento, CA",
    "remote": false,
    "description": "Support case investigations and routine disease surveillance reporting for the county health department.",
    "isSampleData": true
  }
] /* CMS-DATA-END */;

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SAMPLE_JOBS };
}
