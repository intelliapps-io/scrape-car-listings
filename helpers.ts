import puppeteer from "puppeteer"
import fs from "fs"
import { join } from "path"

export const getPrice = (str: string): number | null => {
  const regex = /(Price:( *|\n*)*\$)(\d*,\d*)/gm
  const result = regex.exec(str);
  if (!result) {
    return null
  }
  try {
    return parseInt(result[3].replace(",", ""))
  } catch (err) {
    return null
  }
}

export const getImvPrice = (str: string): number | null => {
  try {
    return parseInt(str.replace('CarGurus IMV of $', '').replace(/\$| |,/g, ''))
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

// for data analysis
export const readCSVFile = (relativePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fs.readFile(join(__dirname, relativePath), {encoding: 'UTF8'}, (err, data) => {
      if (err) 
        reject(err)
      else 
        resolve(data)
    })
  })
}