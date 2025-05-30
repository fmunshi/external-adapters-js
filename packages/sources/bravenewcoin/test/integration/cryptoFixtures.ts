import nock from 'nock'

export function mockCryptoEndpointSuccess() {
  nock('https://bravenewcoin.p.rapidapi.com:443', { encodedQueryParams: true })
    .post('/oauth/token', {
      audience: 'https://api.bravenewcoin.com',
      client_id: 'test-client-id',
      grant_type: 'client_credentials',
    })
    .reply(200, {}, [
      'Content-Type',
      'application/json;charset=UTF-8',
      'Date',
      'Thu, 21 Oct 2021 17:31:21 GMT',
      'Server',
      'RapidAPI-1.2.8',
      'Via',
      '1.1 d83ae0e1ba84e92e58bc1efc23a0c653.cloudfront.net (CloudFront)',
      'X-Amz-Cf-Id',
      '6XfIFuKZzjW60IODVQIEYUrtaldg4nUmhWz_730nDJCQMz5zLr3v6A==',
      'X-Amz-Cf-Pop',
      'HIO50-C1',
      'X-Cache',
      'Miss from cloudfront',
      'X-RapidAPI-Region',
      'AWS - us-west-2',
      'X-RapidAPI-Version',
      '1.2.8',
      'Connection',
      'Close',
    ])

  nock('https://bravenewcoin.p.rapidapi.com:443', { encodedQueryParams: true })
    .get('/asset')
    .query({ status: 'ACTIVE', symbol: 'ETH' })
    .reply(
      200,
      {
        content: [
          {
            id: 'e991ba77-d384-48ff-b0a4-40e95ef6b7d6',
            name: 'Ethereum',
            symbol: 'ETH',
            slugName: 'ethereum',
            status: 'ACTIVE',
            type: 'CRYPTO',
            url: 'https://www.ethereum.org/',
          },
        ],
      },
      [
        'Age',
        '123',
        'Cache-Control',
        'max-age=300',
        'Content-Type',
        'application/json',
        'Date',
        'Thu, 21 Oct 2021 17:31:21 GMT',
        'Server',
        'RapidAPI-1.2.8',
        'Via',
        '1.1 ddd913fbbe7367d44af4ac06097e7a2b.cloudfront.net (CloudFront)',
        'X-Amz-Cf-Id',
        'UaxPeVwgOOn0t1sRyX09YprHVBfJqR00T_o2hsuBOCI8Rf9q_M_l6g==',
        'X-Amz-Cf-Pop',
        'HIO50-C1',
        'X-Cache',
        'Hit from cloudfront',
        'x-content-type-options',
        'nosniff',
        'x-frame-options',
        'DENY',
        'X-RapidAPI-Region',
        'AWS - us-west-2',
        'X-RapidAPI-Version',
        '1.2.8',
        'x-xss-protection',
        '1; mode=block',
        'Connection',
        'Close',
      ],
    )

  nock('https://bravenewcoin.p.rapidapi.com:443', { encodedQueryParams: true })
    .get('/asset')
    .query({ status: 'ACTIVE', symbol: 'BTC' })
    .reply(
      200,
      {
        content: [
          {
            id: 'f1ff77b6-3ab4-4719-9ded-2fc7e71cff1f',
            name: 'Bitcoin',
            symbol: 'BTC',
            slugName: 'bitcoin',
            status: 'ACTIVE',
            type: 'CRYPTO',
            url: 'https://bitcoin.org',
          },
        ],
      },
      [
        'Age',
        '17',
        'Cache-Control',
        'max-age=300',
        'Content-Type',
        'application/json',
        'Date',
        'Thu, 21 Oct 2021 17:31:21 GMT',
        'Server',
        'RapidAPI-1.2.8',
        'Via',
        '1.1 4f87745990545c1ac0195c157e1668f8.cloudfront.net (CloudFront)',
        'X-Amz-Cf-Id',
        'n0Fb95U5o6aEHjAjc14xmfOZxsmHitDfxjmlroZkbLsXd1AlzKdM7A==',
        'X-Amz-Cf-Pop',
        'HIO50-C1',
        'X-Cache',
        'Hit from cloudfront',
        'x-content-type-options',
        'nosniff',
        'x-frame-options',
        'DENY',
        'X-RapidAPI-Region',
        'AWS - us-west-2',
        'X-RapidAPI-Version',
        '1.2.8',
        'x-xss-protection',
        '1; mode=block',
        'Connection',
        'Close',
      ],
    )

  nock('https://bravenewcoin.p.rapidapi.com:443', { encodedQueryParams: true })
    .get('/market-cap')
    .query({ assetId: 'e991ba77-d384-48ff-b0a4-40e95ef6b7d6' })
    .reply(
      200,
      {
        content: [
          {
            id: 'a6d041f2-c021-4bed-8b06-b4f57c178556',
            assetId: 'e991ba77-d384-48ff-b0a4-40e95ef6b7d6',
            timestamp: '2021-10-21T17:30:00.000Z',
            marketCapRank: 2,
            volumeRank: 2,
            price: 4067.385808619922,
            volume: 5128152.035669113,
            totalSupply: 118019641,
            freeFloatSupply: 117378097,
            marketCap: 477422005980.6127,
            totalMarketCap: 480031412941.81793,
          },
        ],
      },
      [
        'Age',
        '11',
        'Cache-Control',
        'max-age=30',
        'Content-Type',
        'application/json;charset=UTF-8',
        'Date',
        'Thu, 21 Oct 2021 17:31:22 GMT',
        'Server',
        'RapidAPI-1.2.8',
        'Via',
        '1.1 d83ae0e1ba84e92e58bc1efc23a0c653.cloudfront.net (CloudFront)',
        'X-Amz-Cf-Id',
        'OzVwFjeO1LQuJ-T5e1BTcDpFdvQnjL5xvD3rlmNwGmRQWLtxD_mN5g==',
        'X-Amz-Cf-Pop',
        'HIO50-C1',
        'X-Cache',
        'Hit from cloudfront',
        'x-content-type-options',
        'nosniff',
        'x-frame-options',
        'DENY',
        'X-RapidAPI-Region',
        'AWS - us-west-2',
        'X-RapidAPI-Version',
        '1.2.8',
        'x-xss-protection',
        '1; mode=block',
        'Connection',
        'Close',
      ],
    )

  nock('https://bravenewcoin.p.rapidapi.com:443', { encodedQueryParams: true })
    .get('/market-cap')
    .query({ assetId: 'f1ff77b6-3ab4-4719-9ded-2fc7e71cff1f' })
    .reply(
      200,
      {
        content: [
          {
            id: '933e8291-9079-44b9-85ea-677c6ee73525',
            assetId: 'f1ff77b6-3ab4-4719-9ded-2fc7e71cff1f',
            timestamp: '2021-10-21T17:30:00.000Z',
            marketCapRank: 1,
            volumeRank: 1,
            price: 63027.507746744726,
            volume: 388130.5821692179,
            totalSupply: 18850181,
            freeFloatSupply: 18847223,
            marketCap: 1187893493637.1255,
            totalMarketCap: 1188079929005.0403,
          },
        ],
      },
      [
        'Cache-Control',
        'max-age=30',
        'Content-Type',
        'application/json;charset=UTF-8',
        'Date',
        'Thu, 21 Oct 2021 17:31:23 GMT',
        'Server',
        'RapidAPI-1.2.8',
        'Via',
        '1.1 4dde8ec6d6c12741888c2d3a059d4a2f.cloudfront.net (CloudFront)',
        'X-Amz-Cf-Id',
        'kbkXn0e973-15v5kOdpYWnpCXperGs65H6UuDtHppzp3u2x8Qjaw2A==',
        'X-Amz-Cf-Pop',
        'HIO50-C1',
        'X-Cache',
        'Miss from cloudfront',
        'x-content-type-options',
        'nosniff',
        'x-frame-options',
        'DENY',
        'X-RapidAPI-Region',
        'AWS - us-west-2',
        'X-RapidAPI-Version',
        '1.2.8',
        'x-xss-protection',
        '1; mode=block',
        'Connection',
        'Close',
      ],
    )
}
