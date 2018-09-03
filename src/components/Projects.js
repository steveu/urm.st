import React, { Component } from 'react'

// Components
import Project from './Project'

class Projects extends Component {
  shouldComponentUpdate() {
    return false;
  }

  render () {
    let { isFeatured } = this.props
    let projects = this.props.projects.sort((a, b) => a.order > b.order)
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