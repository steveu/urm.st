import React, { Component } from 'react';
import Projects from '../components/Projects'

class Home extends Component {
  render() {
    return (
      <div>
        <section className="skills">
          <div className="grid-wrapper">
            {this.props.contents}
            <ul>
              <li>
                <h4>UI & Interaction Design</h4>
                <p>I've led the UI design for digital products alongside being a design-hero developer within product teams.</p>
              </li>
              <li>
                <h4>Frontend Development</h4>
                <p>Razor sharp frontend development skills with a specialty in building component driven UIs using JavaScript/TypeScript and React.</p>
              </li>
              <li>
                <h4>User Experience Design</h4>
                <p>Adept at wireframes and digital product design. Wider experience in product management, digital marketing and user research. </p>
              </li>
            </ul>
          </div>
        </section>
        <Projects
          projects={this.props.projects}
          isFeatured="true"
        />
      </div>
    )
  }
}

export default Home
