import React, { Component } from 'react';

class About extends Component {
  shouldComponentUpdate() {
    return false;
  }
  render() {
    return (
      <section className="about">
        <div className="grid-wrapper">
          <figure className="about__image">
            <picture>
              <source media="(min-width: 44.01em)" srcSet="/assets/images/steve-urmston.jpg" />
              <source media="(min-width: 0px)" srcSet="/assets/images/steve-urmston.landscape.jpg" />
              <img src="/assets/images/steve-urmston.jpg" alt="Steve Urmston - Digital Product Designer" />
            </picture>
          </figure>
          <aside>
            {this.props.contents}
          </aside>
        </div>
      </section>
    )
  }
}

export default About