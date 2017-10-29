# Shopgoodwill CLI

Automatically search and bid on shopgoodwill.com through the command-line with Node.js and Puppeteer.

## Getting Started

### Installation
To use shopgoodwill:

1. Clone the repository
2. Change directory into the cloned repository
2. ```npm install```
3. ```npm link```

### Usage
```shopgoodwill -h```

```
Usage: index [options] [command]

  shopgoodwill.com CLI - search and bid


  Options:

    -V, --version             output the version number
    -o, --output <path>       output path - default prints JSON to console
    -c, --credentials <path>  path to credentials to log into shopgoodwill.com
    -a, --authenticate        prompt to authenticate into shopgoodwill.com
    -v, --verbose             verbose logging
    -h, --help                output usage information


  Commands:

    search [options] [query...]  search queries quoted and separated by a space (i.e. "item 1" "item 2" "item 3")
```
### Example
```shopgoodwill search item```

```
{
  "search": "item",
  "count": "1",
  "items": [
    {
      "id": "00000001",
      "title": "Item",
      "bids": "0",
      "price": "$5.00",
      "end": "10/29/2017 5:30:00 PM",
      "remaining": "5h 29m",
      "url": "https://www.shopgoodwill.com/Item/00000001",
      "image": "https://sgws3productimages.azureedge.net/sgwproductimages/images/0/10-14-2017/00000000000000er-thumb.jpg"
    }
  ]
}
```

## TODO
shopgoodwill is not complete:

- [ ] Bidding
- [ ] More tests
- [x] Search

## License

Copyright © 2017 Shmoopi LLC <shmoopillc@gmail.com> <http://www.shmoopi.net/>

If you like what you see here, or on our website, please feel free to drop us a line or purchase one of our applications!