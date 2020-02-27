// Import CSS so webpack loads it. MiniCssExtractPlugin will split it.
import '../css/app.css';
import { connect } from 'react-redux'
import { Provider } from 'react-redux'
import { mapStateToProps, mapDispatchToProps } from './store.js'
import Grid from './componenets/Grid.js'
import Sidebar from './componenets/Sidebar.js'
import React from "react";
import ReactDOM from "react-dom";
import Prism from "prismjs";


const ConnectedGrid = connect(
    mapStateToProps,
    mapDispatchToProps
  )(Grid)
 
ReactDOM.render(
    <Provider store={store}>
        <ConnectedGrid/>
    </Provider>,
    document.getElementById('root')
);

ReactDOM.render(<Sidebar />, document.getElementById('aa-sidebar-wrapper'));

setTimeout(() => Prism.highlightAll(), 0)