export const evaluateActions = (changes) => {
  function tableToJSON(table) {
    const headers = Array.from(table.querySelectorAll("th")).map((th) =>
      th.innerText.trim()
    );
    const rows = Array.from(table.querySelectorAll("tbody tr"));

    return rows.map((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = cells[i]?.innerText.trim() || "";
      });
      obj.id = row.id;
      return obj;
    });
  }

  function getActions(changes) {
    const data = tableToJSON(document.querySelector("#tableGeneric"));
    const actions = [];

    for (const change of changes) {
      const row = data.find((r) => r["Deduction"] === change.deduction);

      if (!row) {
        actions.push({ type: "create", ...change });
      }

      const oldIsRate = !!parseFloat(row["EE Rate"]);
      const oldLabel = row.Deduction === "Pre Tax 401(k)" ? "PRE" : "POST";
      const oldContribution = oldIsRate
        ? parseFloat(row["EE Rate"])
        : parseFloat(row["EE Per Pay"]);

      if (
        change.isRate === oldIsRate &&
        change.contribution === oldContribution
      ) {
        continue;
      }

      const date = new Date().toLocaleDateString("en-US");
      const newLabel = change.deduction === "Pre Tax 401(k)" ? "PRE" : "POST";
      const newContributionSymbol = change.isRate ? "%" : "";
      const oldContributionSymbol = oldIsRate ? "%" : "";

      actions.push({
        type: "modify",
        ...change,
        id: row.id,
        note: `${date} - TA CONTRIBUTION REPORT, CHANGE ${oldLabel}${oldContribution}${oldContributionSymbol} TO ${newLabel}${change.contribution}${newContributionSymbol}. (AUTO)`,
      });
    }

    return actions;
  }

  return getActions(changes);
};
