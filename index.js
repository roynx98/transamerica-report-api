import puppeteer from "puppeteer";
import express from "express";
import bodyParser from "body-parser";
import fs from "fs";

const app = express();
const environment = process.env.NODE_ENV;
const isProduction = environment === "production";

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("transamerica-report-api running");
});

app.post("/get-report", async (req, res) => {
  const { username, password, startDate, endDate } = req.body;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    ...(isProduction && { executablePath: process.env.CHROMIUM_PATH }),
  });

  try {
    const page = await browser.newPage();

    const client = await page.createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: "./reports",
    });

    const cookies = JSON.parse(fs.readFileSync("./cookies.json", "utf8"));
    await browser.setCookie(...cookies);

    console.log('1')
    await page.goto("https://www.ta-retirement.com/");
    await page.setViewport({ width: 1080, height: 1024 });

    let isLoggedIn = false;
    const profileIconHandle = await page.$("#UcNavGlobal_profileIconCircleDark");
    if (profileIconHandle) {
      const visible = await page.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
      }, profileIconHandle);
      isLoggedIn = Boolean(visible);
    }

    if (!isLoggedIn) {
      console.log('2')
      await page.locator('input[name="txtUsername"]').fill(username);
      console.log('3')
      await page.locator('input[name="txtPassword"]').fill(password);
      console.log('4')
      await page.locator(".submitButton").click();
      console.log('5')
      await page.locator("#m10_5").wait();
    }

    console.log('6')
    await page.goto(
      "https://www.ta-retirement.com/SIP/Employer/PlanReports/Contribution/ps_ContributionRateChange.aspx?UserType=S"
    );

    const startDateInput = await page.$("#ucPlanReports_txtDateStart");
    console.log('7')
    startDateInput.evaluate((el, v) => {
      el.value = v;
    }, startDate);

    const endDateInput = await page.$("#ucPlanReports_txtDateEnd");
    console.log('8')
    endDateInput.evaluate((el, v) => {
      el.value = v;
    }, endDate);

    console.log('9')
    await page.locator('label[for="ucPlanReports_rblParticipants2_0"]').click();

    console.log('10')
    await page.locator("#ucPlanReports_btnSubmit").click();

    await new Promise((resolve) => setTimeout(resolve, 15000));

    await browser.close();
  } catch (err) {
    await browser.close();
    console.error("Error generating report:", err);
    return res.status(500).send("Error generating report");
  }

  try {
    const reportsDir = "./reports";
    const files = await fs.promises.readdir(reportsDir);
    if (!files || files.length === 0) {
      return res.status(404).send("No report found");
    }

    const fileName = files[0];
    const filePath = `${reportsDir}/${fileName}`;
    const buffer = await fs.promises.readFile(filePath);
    const base64 = buffer.toString("base64");

    await fs.promises.unlink(filePath);

    return res.json({ base64 });
  } catch (err) {
    console.error("Error processing report file:", err);
    return res.status(500).send("Error processing report");
  }
});

app.listen(3001, () => {
  console.log("Running on http://localhost:3001");
});
