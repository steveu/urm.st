import React, { Component } from 'react'
import { RouteData, Head } from 'react-static'
import convert from 'htmr'

import AnimatedRoute from '../components/AnimatedRoute'
import Article from '../components/Article'
const AnimatedArticle = AnimatedRoute(Article);

 class ArticleContainer extends Component {
  // shouldComponentUpdate() {
  //   return false;
  // }
  render() {
    return (
      <RouteData>
        {({ article }) => (
          <div>
            <Head>
              <title>{article.title} | Steve Urmston</title>
            </Head>
            <AnimatedArticle title={article.title} contents={convert(article.contents)} />
          </div>
        )}
      </RouteData>
    )
  }
}

export default ArticleContainer
