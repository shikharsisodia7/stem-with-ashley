(function (global) {
  function filterJobs(jobs, filters) {
    const { fieldId, keyword, experienceLevel, location } = filters || {};
    return jobs.filter((job) => {
      if (fieldId && job.fieldId !== fieldId) return false;
      if (experienceLevel && job.experienceLevel !== experienceLevel) return false;
      if (keyword) {
        const k = keyword.trim().toLowerCase();
        if (k) {
          const haystack = `${job.title} ${job.company} ${job.description}`.toLowerCase();
          if (!haystack.includes(k)) return false;
        }
      }
      if (location) {
        if (location.toLowerCase() === "remote") {
          if (!job.remote) return false;
        } else {
          const l = location.toLowerCase();
          if (!job.location.toLowerCase().includes(l)) return false;
        }
      }
      return true;
    });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { filterJobs };
  } else {
    global.filterJobs = filterJobs;
  }
})(typeof window !== "undefined" ? window : globalThis);
