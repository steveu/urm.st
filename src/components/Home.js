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
                <h4>User Interface Design</h4>
                <p>I’ve led UI design for multiple digital products while also being a design-focused developer—bringing ideas to life with precision and empathy for the user experience.</p>
              </li>
              <li>
                <h4>Frontend Development</h4>
                <p>Expert in building scalable, component-driven UIs with JavaScript, TypeScript, and React. Strong focus on performance, accessibility, and maintainable code.</p>
              </li>
              <li>
                <h4>User Experience Design</h4>
                <p>Skilled in wireframing, interaction flows, and end-to-end product design. Backed by experience in product management, user research, and digital strategy.</p>
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
