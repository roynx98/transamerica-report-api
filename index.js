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
  const { username, password, starDate, endDate } = req.body;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    ...(isProduction && { executablePath: process.env.CHROMIUM_PATH }),
  });

  const page = await browser.newPage();

  const cookies = JSON.parse(fs.readFileSync("./cookies.json", "utf8"));
  await browser.setCookie(...cookies);

  await page.goto("https://www.ta-retirement.com/");
  await page.setViewport({ width: 1080, height: 1024 });
  await page.locator('input[name="txtUsername"]').fill(username);
  await page.locator('input[name="txtPassword"]').fill(password);
  await page.locator(".submitButton").click();
  await page.locator("#m10_5").wait();
  await page.goto(
    "https://www.ta-retirement.com/SIP/Employer/PlanReports/Contribution/ps_ContributionRateChange.aspx?UserType=S"
  );

  const startDateInput = await page.$('#ucPlanReports_txtDateStart')
  startDateInput.evaluate((el) => el.value = starDate);

  const endDateInput = await page.$('#ucPlanReports_txtDateEnd')
  endDateInput.evaluate((el) => el.value = endDate);

  await page.locator('label[for="ucPlanReports_rblParticipants2_0"]').click();

  await page.locator("#ucPlanReports_btnSubmit").click()

  await new Promise((resolve) => setTimeout(resolve, 10000));

  await browser.close();
  res.send("Succed");
});

app.listen(3001, () => {
  console.log("Servidor corriendo en http://localhost:3001");
});
