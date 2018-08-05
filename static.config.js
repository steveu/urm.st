import { reloadRoutes } from 'react-static/node'
import jdown from 'jdown'
import chokidar from 'chokidar'
import path from 'path'
import ExtractTextPlugin from 'extract-text-webpack-plugin'

import resumeJson from './data/resume.json'

chokidar.watch('content').on('all', () => reloadRoutes())

export default {
  siteRoot: 'https://urm.st/',
  getSiteData: () => ({
    title: 'Steven Urmston - Digital Product Designer',
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
