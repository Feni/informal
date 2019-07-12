import { configureStore, createSlice } from 'redux-starter-kit'
import { modifySize, parseEverything } from './controller.js'
import { apiPost, cellGet, formatCellOutput } from './utils.js'
import { CELL_MAX_WIDTH, CELL_MAX_HEIGHT } from './utils.js'

const initialState = {
    cells: {
        byId: {
            "id01": {
                id: "id01",
                type: "cell",
                name: "Count",
                input: "1 + 1"
            },
            "id02": {
                id: "id02",
                type: "cell",
                name: "Name",
                input: "2 + 3"
            },
            "id03": {
                id: "id03",
                type: "list",
                name: "List",
                length: 3,
                values: ["id04", "id05", "id06"]
            },
            "id04": {
                id: "id04",
                type: "listcell",
                input: "1",
                parent: "id03"
            },
            "id05": {
                id: "id05",
                type: "listcell",
                input: "2",
                parent: "id03"
            },
            "id06": {
                id: "id06",
                type: "listcell",
                input: "3",
                parent: "id03"
            },
            
            "id07": {
                id: "id07",
                type: "listcell",
                input: "9",
            },
            "id08": {
                id: "id08",
                type: "listcell",
                input: "9",
            },            
            "id09": {
                id: "id09",
                type: "listcell",
                input: "9",
            },
            "id10": {
                id: "id10",
                type: "listcell",
                input: "9",
            },
            "id11": {
                id: "id11",
                type: "listcell",
                input: "9",
            },
            "id12": {
                id: "id12",
                type: "listcell",
                input: "9",
            },
            "id13": {
                id: "id13",
                type: "listcell",
                input: "9",
            },
            "id14": {
                id: "id14",
                type: "listcell",
                input: "9",
            },
            "id15": {
                id: "id15",
                type: "listcell",
                input: "9",
            },                                                                                    

            
        },
        allIds: ["id01", "id02", "id03", "id04", "id05", "id06", "id07", "id08", "id09", "id10", "id11", "id12", "id13", "id14", "id15",],
        focus: null,  // ID of the element selected
        modified: true,  // Allow initial evaluation
    }
}

// 280
for(var i = 7; i < 280; i++){
    let id = "id";
    if(i < 10) {
        id += "0";
    }
    id += i

    initialState.cells.byId[id] = {
        "id": id,
        "type": "cell"
    }
    initialState.cells.allIds.push(id);
}



const cellsSlice = createSlice({
    slice: 'cells',
    initialState: initialState.cells,
    reducers: {
        setInput: (state, action) => {
            let cell = state.byId[action.payload.id]
            console.log(action.payload.id);
            console.log(cell);
            cell.input = action.payload.input;
            state.modified = true;
        },
        setName: (state, action) => {
            let cell = state.byId[action.payload.id]
            console.log(action.payload.id);
            console.log(cell);
            cell.name = action.payload.name;
            state.modified = true;
        },        
        setModified: (state, action) => {
            state.modified = true;
        },
        saveOutput: (state, action) => {
            let status = action.payload.status;
            let response = action.payload.response;
            console.log(response);
            const responseCells = response["results"];
            responseCells.forEach((responseCell) => {
                let stateCell = state.byId[responseCell.id];
                stateCell.output = responseCell.output;
                stateCell.error = responseCell.error;
            });
            // Short-circuit re-evaluation until a change happens.
            state.modified = false;
        },
        incWidth: (state, action) => {
            modifySize(state.byId[action.payload.id], "width", 1, CELL_MAX_WIDTH, action.payload.amt);
        }, 
        incHeight: (state, action) => {
            modifySize(state.byId[action.payload.id], "height", 1, CELL_MAX_HEIGHT, action.payload.amt);
        },
        setFocus: (state, action) => {
            state.focus = action.payload
        },
        moveFocus: (state, action) => {
            let currentIndex = state.allIds.indexOf(state.focus);
            if(currentIndex !== -1){
                let newIndex = currentIndex + action.payload;
                if(newIndex >= 0 && newIndex <= state.allIds.length){
                    state.focus = state.allIds[newIndex];
                }
            }
        }
    }
})


const setInput = cellsSlice.actions.setInput;
const setName = cellsSlice.actions.setName;
const saveOutput = cellsSlice.actions.saveOutput;
// const reEvaluate = cellsSlice.actions.reEvaluate;
const incWidth = cellsSlice.actions.incWidth;
const incHeight = cellsSlice.actions.incHeight;
const setFocus = cellsSlice.actions.setFocus;
const moveFocus = cellsSlice.actions.moveFocus;
const setModified = cellsSlice.actions.setModified;


const reEvaluate = () => {
    return (dispatch, getState) => {
        const state = getState();
        if(state.cellsReducer.modified === false){
            return
        }
        let parsed = parseEverything(state.cellsReducer.byId);

        apiPost("/api/evaluate", parsed)
        .then(json => {
            // Find the cells and save the value.;
            dispatch(saveOutput({
                'status': true,
                'response': json
            }))
        })
        .catch(error => {
            // document.getElementById("result").textContent = "Error : " + error
            console.log("Error")
            console.log(error);
            // TODO error state 
            // This happens separate from an individual cell failing.
        });
    }
}

const cellsReducer = cellsSlice.reducer;
export const store = configureStore({
  reducer: {
    cellsReducer
  }
})

window.store = store;

// Initial evaluation
store.dispatch(reEvaluate())

export const mapStateToProps = (state /*, ownProps*/) => {
    return {
        cells: state.cellsReducer.allIds.map((id) => state.cellsReducer.byId[id]),
        byId: state.cellsReducer.byId,
        focus: state.cellsReducer.focus
    }
}

export const mapDispatchToProps = {setFocus, setInput, setName, reEvaluate, incWidth, incHeight, moveFocus, setModified}