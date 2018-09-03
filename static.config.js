import React from 'react'
import { reloadRoutes } from 'react-static/node'
import jdown from 'jdown'
import chokidar from 'chokidar'
import path from 'path'
import ExtractTextPlugin from 'extract-text-webpack-plugin'
const webpack = require('webpack')

const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');
const PUBLIC_PATH = 'https://urm.st/'; 

import resumeJson from './data/resume.json'

const personSchema = {
  "@context": "http://schema.org/",
  "@type": "Person",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "GB",
    "addressLocality": "York",
    "postalCode": "YO10 4QE",
    "streetAddress": "The Coach House, Fulford Park",
    "name": "Steve Urmston"
  },
  "email": "steve@urm.st",
  "name": "Steve Urmston",
  "jobTitle": "Full Stack Digital Product Designer"
}

chokidar.watch('content').on('all', () => reloadRoutes())

export default {
  siteRoot: 'https://urm.st/',
  prefetchRate: 5,
  Document: ({ Html, Head, Body, children, siteData, renderMeta }) => (
    <Html lang="en-US">
      <Head>
        <meta charSet="UTF-8" />
        <title>Steve Urmston | Full Stack Digital Product Designer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="alternate" href="urm.st" hrefLang="en-gb" />
      </Head>
      <Body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      </Body>
    </Html>
  ),
  getSiteData: () => ({
  }),
  getRoutes: async () => {
    const resume = resumeJson
    const { projects, home, about } = await jdown('content')
    return [
      {
        path: '/',
        component: 'src/containers/HomeContainer',
        getData: () => ({
          projects, home,
        }),
      },
      {
        path: '/about',
        component: 'src/containers/AboutContainer',
        getData: () => ({
          about,
        }),
      },
      {
        path: '/resume',
        component: 'src/containers/Resume',
        getData: () => ({
          resume,
        }),
      },
      {
        path: '/work',
        component: 'src/containers/WorkContainer',
        getData: () => ({
          projects,
        }),
        children: projects.filter((project) => { return project.case_study; }).map(project => ({
          path: `${project.slug}`,
          component: 'src/containers/CaseStudy',
          getData: () => ({
            project,
          }),
        })),
      },
      {
        is404: true,
        component: 'src/containers/404',
      },
    ]
  },
  webpack: (config, { defaultLoaders, stage }) => {

    let loaders = []

    if (stage === 'dev') {
      loaders = [
        { loader: 'style-loader' },
        { loader: 'css-loader' },
        {
          loader: 'sass-loader',
          options: {
            includePaths: ['src/', path.resolve(__dirname, 'node_modules/')]
          }
        }
      ]
    } else {
      loaders = [
        {
          loader: 'css-loader',
          options: {
            importLoaders: 1,
            minimize: false,
            sourceMap: false,
            modules: false,
          }
        },
        {
          loader: 'postcss-loader',
          options: {
            ident: 'postcss',
            plugins: (loader) => [
              require('cssnano')(),
              require('autoprefixer')()
            ]
          }
        },
        {
          loader: 'sass-loader',
          options: { includePaths: ['src/', 'node_modules/'] },
        },
      ]

      // Don't extract css to file during node build process
      if (stage !== 'node') {
        loaders = ExtractTextPlugin.extract({
          fallback: {
            loader: 'style-loader',
            options: {
              sourceMap: false,
              hmr: false,
            },
          },
          use: loaders,
        })
      }
    }

    config.module.rules = [
      {
        oneOf: [
          {
            test: /\.svg$/,
            loader: 'svg-sprite-loader'
          },
          {
            test: /\.s(a|c)ss$/,
            use: loaders,
          },
          defaultLoaders.cssLoader,
          defaultLoaders.jsLoader,
          defaultLoaders.fileLoader,
        ],
      },
    ]

    if (stage === 'prod') {
      config.plugins.push(
        new webpack.optimize.UglifyJsPlugin({
          compress: {
            drop_console: true
          }
        }),
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify('production')
        }),
        new webpack.optimize.ModuleConcatenationPlugin(),
        new SWPrecacheWebpackPlugin(
          {
            cacheId: 'urm.st',
            dontCacheBustUrlsMatching: /\.\w{8}\./,
            filename: 'service-worker.js',
            minify: true,
            navigateFallback: PUBLIC_PATH + 'index.html',
            staticFileGlobsIgnorePatterns: [/\.map$/, /asset-manifest\.json$/],
          }
        ),
      )
    }

    return config
  },
  preact: true,
}
