import puppeteer from "puppeteer";
import express from "express";
import bodyParser from "body-parser";

const app = express();
const environment = process.env.NODE_ENV;
const isProduction = environment === "production";

app.use(bodyParser.json());

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
  ...(isProduction && { executablePath: process.env.CHROMIUM_PATH }),
});

app.post("/", async (req, res) => {
  const { username, password } = req.body;

  const page = await browser.newPage();
  await page.goto("https://www.ta-retirement.com/");
  await page.setViewport({ width: 1080, height: 1024 });
  await page.locator('input[name="txtUsername"]').fill(username);
  await page.locator('input[name="txtPassword"]').fill(password);
  await page.locator(".submitButton").click();
  await page.locator("#securityCode").wait();
  const header = await page.locator("h1").waitHandle();
  const fullTitle = await header.evaluate((el) => el.textContent);
  await browser.close();
  res.send(fullTitle);
});

app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
