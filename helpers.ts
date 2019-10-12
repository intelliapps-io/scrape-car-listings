import puppeteer from "puppeteer"

export const getPrice = (str: string): number | null => {
  const regex = /(Price:( *|\n*)*\$)(\d*,\d*)/gm
  const result = regex.exec(str);
  if (!result) {
    console.log(str)
    return null
  }
  try {
    return parseInt(result[3].replace(",", ""))
  } catch (err) {
    return null
  }
}

export const getMileage = (str: string): number | null => {
  const regex = /(Mileage: )(\d*,\d*)/gm
  const result = regex.exec(str);
  if (!result) return null
  try {
    return parseInt(result[2].replace(",", ""))
  } catch (err) {
    return null
  }
}

export async function getInnerText(element: puppeteer.ElementHandle<Element>): Promise<string> {
  const propertyHandle = await element.getProperty('innerText').catch((err) => { throw err });
  return await propertyHandle.jsonValue().catch((err) => { throw err });
}