import React from 'react'
import { withRouteData, Link } from 'react-static'
import convert from 'htmr'
import Icon from 'Icon'
//

export default withRouteData(({ home, projects }) => (
  <div>
    <section className="skills">
      <div className="grid-wrapper">
        {convert(home.contents)}
        <ul>
          <li>
            <h4>Product Management</h4>
            <p>Strategy, Business, Leadership</p>
          </li>
          <li>
            <h4>User Experience Design</h4>
            <p>User testing, Wireframes, Prototyping</p>
          </li>
          <li>
            <h4>UI & Interaction Design</h4>
            <p>For Web and Mobile</p>
          </li>
          <li>
            <h4>JavaScript Development</h4>
            <p>Node, AngularJS, React, Vue</p>
          </li>
          <li>
            <h4>Responsive Web Design</h4>
            <p>HTML, CSS</p>
          </li>
          <li>
            <h4>Digital Marketing</h4>
            <p>Analytics, CRO and SEO</p>
          </li>
        </ul>
      </div>
    </section>
    {projects.map(project => (
      <section className={project.class} key={project.slug}>
        <div className="wrapper work">
          <figure>
            <Link to={`/work/${project.slug}/`}>
              <img src={`projects/${project.slug}-hero.png`} width="400px" />
            </Link>
          </figure>
          <aside>
            <h2>{project.title}</h2>
            {project.description.map(paragraph => (
              <p>{paragraph}</p>
            ))}
          </aside>
        </div>
      </section>
    ))}

  </div>
))