import React from 'react'
import { reloadRoutes } from 'react-static/node'
import jdown from 'jdown'
import chokidar from 'chokidar'
import path from 'path'
import ExtractTextPlugin from 'extract-text-webpack-plugin'

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
  "familyName": "Urmston",
  "givenName": "Steve",
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
        <title>Steve Urmston | Digital Product Designer</title>
        <meta name="description" content="Full Stack Digital Product Designer based in York, UK" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
        component: 'src/containers/Home',
        getData: () => ({
          projects, home,
        }),
      },
      {
        path: '/about',
        component: 'src/containers/About',
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
        component: 'src/containers/Work',
        getData: () => ({
          projects,
        }),
        // children: projects.map(project => ({
        //   path: `${project.slug}`,
        //   component: 'src/containers/CaseStudy',
        //   getData: () => ({
        //     project,
        //   }),
        // })),
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
            minimize: stage === 'prod',
            sourceMap: false,
            modules: false,
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
    return config
  },
  preact: true,
}
