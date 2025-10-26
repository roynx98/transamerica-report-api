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
  const { username, password, startDate, endDate, cookies } = req.body;
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--user-data-dir=./userData",
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

    if (cookies) {
      await browser.setCookie(...cookies);
    }

    await page.goto("https://www.ta-retirement.com/");
    await page.setViewport({ width: 1080, height: 1024 });

    let isLoggedIn = false;
    const profileIconHandle = await page.$(
      "#UcNavGlobal_profileIconCircleDark"
    );
    if (profileIconHandle) {
      const visible = await page.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          el.offsetParent !== null
        );
      }, profileIconHandle);
      isLoggedIn = Boolean(visible);
    }

    if (!isLoggedIn) {
      await page.locator('input[name="txtUsername"]').fill(username);
      await page.locator('input[name="txtPassword"]').fill(password);
      await page.locator(".submitButton").click();
      await page.locator("#m10_5").wait();
    }

    await page.goto(
      "https://www.ta-retirement.com/SIP/Employer/PlanReports/Contribution/ps_ContributionRateChange.aspx?UserType=S"
    );

    const startDateInput = await page.$("#ucPlanReports_txtDateStart");
    startDateInput.evaluate((el, v) => {
      el.value = v;
    }, startDate);

    const endDateInput = await page.$("#ucPlanReports_txtDateEnd");
    endDateInput.evaluate((el, v) => {
      el.value = v;
    }, endDate);

    await page.locator('label[for="ucPlanReports_rblParticipants2_0"]').click();

    await page.locator("#ucPlanReports_btnSubmit").click();

    await new Promise((resolve) => setTimeout(resolve, 15000));

    await browser.close();
  } catch (err) {
    await browser.close();
    console.error("Error generating report:", err);
    return res.status(500).send("Error generating report");
  }

  await browser.close();

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

app.post("/pro", async (req, res) => {
  const { username, password, targetFullName } = req.body;
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--user-data-dir=./userData",
    ],
    ...(isProduction && { executablePath: process.env.CHROMIUM_PATH }),
  });

  try {
    const page = await browser.newPage();

    await page.goto("https://guhroo.prosoftware.com/");
    await page.setViewport({ width: 1080, height: 1024 });

    await page.locator("#txtErUsername").fill(username);
    await page.locator("#txtErPassword").fill(password);

    await page.locator(".form-group .btn-primary").click();

    await page.waitForSelector("#spanQuestion");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const question = await page.$eval("#spanQuestion", (el) => el.value);
    let response = "";
    if (question.includes("primary school")) {
      response = "Colegio Fresnillo";
    } else if (question.includes("first pet")) {
      response = "Lucky";
    } else {
      response = "CDMX";
    }
    await page.locator("#txtAnswer").fill(response);

    await page.locator(".form-group .btn-primary").click();

    await page.waitForSelector("#banner-title-dashboard");
    await page.goto("https://guhroo.prosoftware.com/master.aspx#setupuser2");

    await page.waitForSelector("#tableUser_processing", { visible: true });
    await page.waitForSelector("#tableUser_processing", { hidden: true });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await page.locator(".input-sm").fill(targetFullName);

    await page.waitForSelector("#tableUser_processing", { visible: true });
    await page.waitForSelector("#tableUser_processing", { hidden: true });
    await page.locator(".link").click();

    const newPage = await new Promise(resolve => browser.once('targetcreated', target => resolve(target.page())));
    await newPage.setViewport({ width: 1080, height: 1024 });
    await newPage.waitForSelector('.panel-heading');

    await newPage.locator(".ViewDeductions").click();

    await new Promise((resolve) => setTimeout(resolve, 4000));

    await browser.close();
  } catch (err) {
    await browser.close();
    console.log(err);
    return res.status(500).send("Error going to prosoftware");
  } finally {
    await browser.close();
  }

  return res.send("Prosoftware login attempted");
});

app.listen(3001, () => {
  console.log("Running on http://localhost:3001");
});
