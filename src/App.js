import React from 'react'
import { Router, Route, cleanPath, Head } from 'react-static'
import Routes from 'react-static-routes'

// Hot loading development
import { hot } from 'react-hot-loader'

// Animated routes
import { easeQuadOut } from 'd3-ease'
import { NodeGroup } from 'react-move'
import { withContext, getContext } from 'recompose'
import PropTypes from 'prop-types'

// Components
import Header from './components/Header'
import Footer from './components/Footer'

// Styles
import './app.scss'

// The magic :)
const AnimatedRoutes = getContext({
  // We have to preserve the router context for each route
  // otherwise, a component may rerender with the wrong data
  // during animation
  router: PropTypes.object,
  // We'll also look for the staticURL, so we can disable the animation during static render
  staticURL: PropTypes.string,
})(({ getComponentForPath, router, staticURL }) => (
  <Route
    path="*"
    render={props => {
      // Get the component for this path
      let Comp = getComponentForPath(cleanPath(props.location.pathname))
      if (!Comp) {
        Comp = getComponentForPath('404')
      }

      // When we're rendering for static HTML, be sure to NOT animate in.
      if (staticURL) {
        return (
          // This relative wrapper is necessary for accurate rehydration :)
          <div style={{ position: 'relative' }}>
            <Comp {...props} />
          </div>
        )
      }
      
      // Use React-Move to animate the different components coming in and out
      return (
        <NodeGroup
          // React-move will handle the entry and exit of any items we pass in `data`
          data={[
            {
              // pass the current Comp, props, ID and router
              id: props.location.pathname,
              Comp,
              props,
              router,
            },
          ]}
          keyAccessor={d => d.id}
          start={() => ({
            opacity: [0],
            scale: 1,
            translateY: [15],
          })}
          enter={() => ({
            opacity: [1],
            translateY: [0],
            timing: { duration: 200, delay: 200, ease: easeQuadOut },
          })}
          update={() => ({
            opacity: [1],
          })}
          leave={() => ({
            opacity: [0],
            translateY: [-15],
            timing: { duration: 200, ease: easeQuadOut },
            events: {
              start() { // runs in the context of the node
              },
              interrupt() { // runs in the context of the node
              },
              end() { // runs in the context of the node
              },
            },
          })}
        >
          {nodes => (
            <div style={{ position: 'relative' }}>
              {nodes.map(({ key, data, state: { opacity, translateY } }) => {
                // Here, we override the router context with the one that was
                // passed with each route
                const PreservedRouterContext = withContext(
                  {
                    router: PropTypes.object,
                  },
                  () => ({
                    router: data.router,
                  }),
                )(props => <div {...props} />)

                return (
                  <PreservedRouterContext
                    key={key}
                    style={{
                      position: 'relative',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      transform: `translateY(${translateY}px)`,
                      opacity,
                    }}
                  >
                    <data.Comp {...data.props} />
                  </PreservedRouterContext>
                )
              })}
            </div>
          )}
        </NodeGroup>
      )
    }}
  />
))

const App = () => (
  <Router>
    <div>
      <Head>
        <title>Steven Urmston | Digital Product Designer</title>
        <meta name="description" content="Full Stack Digital Product Designer based in York, UK" />
      </Head>
      <div className="container">
        <Header />
        <div className="content">
          <Routes component={AnimatedRoutes} />
        </div>
        <Footer />
      </div>
    </div>
  </Router>
)

export default hot(module)(App)
