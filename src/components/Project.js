import React, { PureComponent } from 'react'
import { Link } from 'react-static'

class Project extends PureComponent {

  render () {
    const { project } = this.props
    return (
      <section className={project.class} key={project.slug}>
        <div className="grid-wrapper">
          <div className="work">
            <aside className="work__description">
              <h2>{project.title}</h2>
              {project.description.map(paragraph => (
                <p>{paragraph}</p>
              ))}

              {project.case_study && (
                <Link className="button" to={`/work/${project.slug}/`}>
                  Read case study
                </Link>
              )}
            </aside>
            <figure className="work__figure">
              {project.case_study ? (
                <Link to={`/work/${project.slug}/`}>
                  <img src={`/projects/${project.slug}-hero.png`} width="100%" />
                </Link>
              ) : (
                <img src={`/projects/${project.slug}-hero.png`} width="100%" />
              )}
            </figure>
          </div>
        </div>
      </section>
    )
  }
}

export default Project