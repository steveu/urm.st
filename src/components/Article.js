import React, { Component } from 'react';
import { Link } from 'react-static';

class Article extends Component {
  // shouldComponentUpdate() {
  //   return false;
  // }
  render() {
    return (
      <section className="article">
        <div className="article__grid">
          {this.props.contents}
          <p>
            <Link to="/work">See more of my work</Link>
          </p>
        </div>
      </section>
    )
  }
}

export default Article