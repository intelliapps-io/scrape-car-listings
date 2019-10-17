import puppeteer from 'puppeteer'
import { parse } from 'json2csv'
import { getInnerText, getMileage, getPrice, getImvPrice } from './helpers';
import { writeFileSync } from 'fs';
import { join } from 'path';

const searchNational = `https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=untrackedExternal_false_0&newSearchFromOverviewPage=true&inventorySearchWidgetType=AUTO&entitySelectingHelper.selectedEntity=c23830&entitySelectingHelper.selectedEntity2=c23830&zip=02019&distance=50000&searchChanged=true&transmission=A&maxAccidents=0&hideFrameDamaged=true&hideSalvage=true&modelChanged=false&filtersModified=true`
const search500mi = `https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=untrackedExternal_false_0&newSearchFromOverviewPage=true&inventorySearchWidgetType=AUTO&entitySelectingHelper.selectedEntity=c23830&entitySelectingHelper.selectedEntity2=c23830&zip=02019&distance=500&searchChanged=true&transmission=A&maxAccidents=0&hideFrameDamaged=true&hideSalvage=true&modelChanged=false&filtersModified=true`
const url = searchNational

export interface IListingData {
  mileage: number,
  price: number,
  imvPrice: number,
  listingUrl: string
}

type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

let unfilteredListingsData: Nullable<IListingData>[] = []

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const context = await browser.createIncognitoBrowserContext();
  const page = await context.newPage();
  await page.goto(url);

  // get Listings
  await getPageListings(page)

  console.log(`
    TOTAL LISTING COUNT: ${unfilteredListingsData.length}`)

  await browser.close()
}

async function getListingData(page: puppeteer.Page, element: puppeteer.ElementHandle<Element>): Promise<Nullable<IListingData>> {
  // get listing data string
  const dataContainer = await element.$('.cg-dealFinder-result-stats')
  let dataContainerText: string | null = null
  if (!dataContainer)
    throw new Error('listing data containter not found')
  else 
    dataContainerText = await getInnerText(dataContainer)
  
  // parse IMV price
  const imvPriceContainer = await element.$('.cg-dealfinder-result-deal-imv')
  let imvPrice: number | null = null
  if (imvPriceContainer)
    imvPrice = getImvPrice(await getInnerText(imvPriceContainer))
  
  // get listing ID and url
  const listingIdHandler = await element.getProperty('id')
  const listingId = await listingIdHandler.jsonValue()
  const listingUrl = `https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?#listing=${listingId}`

  return ({
    mileage: getMileage(dataContainerText),
    price: getPrice(dataContainerText),
    imvPrice,
    listingUrl: listingUrl
  })
}

async function getPageListings(page: puppeteer.Page) {
  const containerResults = await page.$('.ft-listing-results__list-container')
  if (!containerResults)
    throw new Error('could not find list container')

  const listContainerChildren = await containerResults.$x('div')

  // find listings in array of children
  for (let i = 0; i < listContainerChildren.length; i++) {
    const listChild = listContainerChildren[i]
    const propertyHandle = await listChild.getProperty('id')
    const id = await propertyHandle.jsonValue();

    // check if is listing element
    if (typeof id === "string" && id.indexOf('listing') > -1) {
      const listingData = await getListingData(page, listChild)
        .catch(err => { throw err })
      
      console.log(`processing listing ${unfilteredListingsData.length}`)

      // push listing data to array
      if (listingData)
        unfilteredListingsData.push(listingData)

      // screenshot listings
      // await page.focus(`#${id}`)
      // await listChild.screenshot({ path: `screenshots/${id}.png`, type: "png" })
    }
  }

  // check next page
  const nextPageBtn = await page.$('.nextPageElement')
  if (nextPageBtn)
    try {
      console.log("next page")
      await nextPageBtn.click()
      await page.waitFor(500)
      await getPageListings(page)
    } catch (err) {}
}

main()
  .then(() => {
    const filteredResults = unfilteredListingsData.filter(listing => {
      if (listing.mileage && listing.price && listing.imvPrice && listing.listingUrl)
        return listing
    }) as IListingData[]

    const csv = parse(filteredResults, { fields: ['mileage', 'price', 'imvPrice', 'listingUrl'] })

    writeFileSync(join(__dirname, 'data.csv'), csv, { encoding: 'UTF8' })

    console.log('done!')
  })
  .catch((err) => {
    console.error(err)
    process.exit()
  })
