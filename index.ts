import puppeteer from 'puppeteer'
import { getInnerText, getMileage, getPrice } from './helpers';

const url = `https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=untrackedExternal_false_0&newSearchFromOverviewPage=true&inventorySearchWidgetType=AUTO&entitySelectingHelper.selectedEntity=c23830&entitySelectingHelper.selectedEntity2=c23830&zip=02019&distance=500&searchChanged=true&transmission=A&maxAccidents=0&hideFrameDamaged=true&hideSalvage=true&modelChanged=false&filtersModified=true`

let listings: puppeteer.ElementHandle<Element>[] = []
let data: {
  mileage: number | null,
  price: number | null,
  listingUrl: string
}[] = []

let mileageSUM = 0;
let priceSUM = 0;
let listingCOUNT = 0;

async function main() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  
  // get Listings
  await getPageListings(page)

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i]
    const result = await getListingData(page, listing).catch(err => console.log(err))
    if (result)
      data.push({
        mileage: getMileage(result.dataText),
        price: getPrice(result.dataText),
        listingUrl: result.listingUrl
      })
  }

  data.forEach(item => {
    if (item.mileage && item.price) { 
      listingCOUNT++
      mileageSUM += item.mileage
      priceSUM += item.price
    } 
  })

  console.log(data)
  console.log(`LISTING COUNT: ${listingCOUNT}`)
  console.log(`PRICE AVG: ${priceSUM/listingCOUNT}`)
  console.log(`MILEAGE AVG: ${mileageSUM/listingCOUNT}`)

  

  await browser.close()
}

async function getListingData(page: puppeteer.Page, element: puppeteer.ElementHandle<Element>): Promise<{ dataText: string, listingUrl: string }> {
  const dataContainer = await element.$('.cg-dealFinder-result-stats')
  if (!dataContainer)
    throw new Error('listing data containter not found')

  const listingIdHandler = await element.getProperty('id')
  const listingId = await listingIdHandler.jsonValue()

  const listingUrl = `https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?#listing=${listingId}`

  return ({
    dataText: await getInnerText(dataContainer),
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
    if (typeof id === "string" && id.indexOf('listing') > -1) {
      listings.push(listChild)

      // Screenshot Listings
      // await page.focus(`#${id}`)
      // await listChild.screenshot({ path: `screenshots/${id}.png`, type: "png" })
    }
  }

  // check next page
  const nextPageBtn = await page.$('.nextPageElement')
  if (nextPageBtn)
    try {
      await nextPageBtn.click()
      await page.waitFor(500)
      await getPageListings(page)
    } catch (err) { }
}

main()
  .then(() => console.log('done!'))
  .catch((err) => {
    console.error(err)
    process.exit()
  })
