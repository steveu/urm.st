import React, { PureComponent } from 'react'

// Components
import Project from './Project'


class Projects extends PureComponent {

  render () {
    let { isFeatured } = this.props
    let projects = this.props.projects.sort((a, b) => a.order > b.order)

    console.log(projects);
    if (isFeatured) {
      projects = projects.filter(function(project) { return project.feature; })
    }

    return (
      <div>
        {projects.map((project, index) => (
          <Project
            key={`project-${project.slug}`}
            project={project}
          />
        ))}
      </div>
    )
  }
}

export default Projects