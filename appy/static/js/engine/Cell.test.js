import { Cell, Environment } from './Cell.js';


const ROOT_ID = 0;

// Valid basic tree
//        a
//     b    c
//          d
//        e   f
// Expected: e/f d c b a
const TREE_BASIC = {
  0: {
    id: ROOT_ID,
    name: "",
    depends_on: [], 

    body: [1, 2, 3, 4, 5, 6],
    params: []
  },
  1: {
      id: 1,
      name: "a",
      depends_on: [2, 3],     // Extracted from parse tree after name resolution.
      
      body: [],
      params: []
  },
  2: {
      id: 2,
      name: "b",
      depends_on: [],

      body: [],
      params: []
  },
  3: {
      id: 3,
      name: "c",
      depends_on: [4],

      body: [],
      params: []
  }, 
  4: {
    id: 4,
    name: "d",
    depends_on: [5, 6],

    body: [],
    params: []
  }, 
  5: {
    id: 5,
    name: "e",
    depends_on: [],

    body: [],
    params: []
  }, 
  6: {
    id: 6,
    name: "f",
    depends_on: [],

    body: [],
    params: []
  }
}


// Tree where no cells depend on each other.
const INDEPENDENT_TREE = {
    0: {
      id: ROOT_ID,
      name: "",
      depends_on: [], 
  
      body: [1, 2, 3],
      params: []
    },
    1: {
        id: 1,
        name: "a",
        depends_on: [],     // Extracted from parse tree after name resolution.
        
        body: [],
        params: []
    },
    2: {
        id: 2,
        name: "b",
        depends_on: [],
  
        body: [],
        params: []
    },
    3: {
        id: 3,
        name: "c",
        depends_on: [],
  
        body: [],
        params: []
    }, 
}  


test('mark dependency usage', () => {
    let env = new Environment(TREE_BASIC);
    let root = new Cell(TREE_BASIC[0], undefined, env);
    
    expect(Array.from(env.getUsedBy(2))).toEqual([1]);
})


test('independent order maintained', () => {
    // When cells don't depend on each other, their order remains the same
    let env = new Environment(INDEPENDENT_TREE);
    let root = new Cell(INDEPENDENT_TREE[0], undefined, env);
  
    let depOrder = env.totalOrderByDeps()

    let cycles = env.cyclic_cells;
    let order = env.eval_order;
    
    console.log(order);
    // No cycles
    expect(cycles.size).toBe(0);

    // Order maintained as original
    expect(order[0].name).toEqual("a");
    expect(order[1].name).toEqual("b");
    expect(order[2].name).toEqual("c");
    expect(order.length).toEqual(3);

    
});


// test('dependency order maintained', () => {
//     let cellMap = {};
//     let root = new Cell(TREE_BASIC[0], undefined, TREE_BASIC, cellMap);

//     Cell.markDependencies(TREE_BASIC, cellMap);
//     let depOrder = Cell.orderByDeps(cellMap)

//     let cycles = depOrder['cycles'];
//     let order = depOrder['order'];

//     let a = mutIdMap[1];
//     let b = mutIdMap[2];
//     let c = mutIdMap[3];
//     let d = mutIdMap[4];
//     let e = mutIdMap[5];
//     let f = mutIdMap[5];

//     // No cycles
//     expect(cycles.size).toBe(0);

//     // No cycles
//     expect(order.indexOf).toBe(0);
// });
