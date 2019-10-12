import puppeteer from 'puppeteer'

const url = `https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=untrackedExternal_false_0&newSearchFromOverviewPage=true&inventorySearchWidgetType=AUTO&entitySelectingHelper.selectedEntity=c23830&entitySelectingHelper.selectedEntity2=c23830&zip=02019&distance=500&searchChanged=true&transmission=A&maxAccidents=0&hideFrameDamaged=true&hideSalvage=true&modelChanged=false&filtersModified=true`

let listings: puppeteer.ElementHandle<Element>[] = []

async function main() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  // get Listings
  await getPageListings(page)


  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i]
    const result = await getListingData(listing).catch(err => console.log(err))
    console.log(result)
  }

  console.log(`LISTING TOTAL: ${listings.length}`)

  await browser.close()
}

async function getListingData(element: puppeteer.ElementHandle<Element>) {
  const dataContainer = await element.$('.cg-dealFinder-result-stats')
  if (!dataContainer)
    throw new Error('listing data containter not found')
  return await getInnerText(dataContainer)
}

async function getInnerText(element: puppeteer.ElementHandle<Element>): Promise<string> {
  const propertyHandle = await element.getProperty('innerText').catch((err) => { throw err });
  return await propertyHandle.jsonValue().catch((err) => { throw err });
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
    if (typeof id === "string" && id.indexOf('listing') > -1)
      listings.push(listChild)
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