import React, { PureComponent } from 'react'
import { Link } from 'react-static'

class Project extends PureComponent {

  renderFigure(project) {
    switch(project.type) {
      case 'iframe':
        return (
          <figure className="work__figure">
            <div class="fluid-iframe">
              <iframe
                width="100%"
                src={project.iframe}
                frameborder="0"
                marginwidth="0"
                marginheight="0"
                scrolling="no"
                allowfullscreen=""
              ></iframe>
            </div>
          </figure>
        )
      default:
        return (
          <figure className="work__figure">
            {project.case_study ? (
              <Link to={`/work/${project.slug}/`}>
                <img src={project.image} width="100%" />
              </Link>
            ) : (
              <img src={`/projects/${project.slug}-hero.png`} width="100%" />
            )}
          </figure>
        )
    }
  }

  render () {
    const { project } = this.props
    return (
      <section className={project.class} key={project.slug}>
        <div className="grid-wrapper">
          <div className="work">
            {this.renderFigure(project)}
            <aside className="work__description">
              <h2>{project.title}</h2>
              <p className="subtitle">{project.subtitle}</p>
              {project.description.map(paragraph => (
                <p>{paragraph}</p>
              ))}

              {project.case_study && (
                <Link className="button" to={`/work/${project.slug}/`}>
                  Read case study
                </Link>
              )}
              {project.download && (
                <a className="button" href={project.download}>
                  Download the PDF
                </a>
              )}
            </aside>
          </div>
        </div>
      </section>
    )
  }
}

export default Project