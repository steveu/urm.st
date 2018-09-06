import React, { Component } from 'react';

class Article extends Component {
  // shouldComponentUpdate() {
  //   return false;
  // }
  render() {
    return (
      <section className="article">
        <div className="article__grid">
          {this.props.contents}
        </div>
      </section>
    )
  }
}

export default Article