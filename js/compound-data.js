/** IDs remain stable across rebuilds, animation and recursion. */
export const COMPOUNDS = [
  {id:'merkaba',name:'Меркаба · 2 тетраэдра',members:['merkaba_up','merkaba_down'],kind:'tetrahedron'},
  {id:'tetra5',name:'Соединение 5 тетраэдров',members:Array.from({length:5},(_,i)=>`tetra5_${i}`),kind:'tetrahedron'},
  {id:'cube5',name:'Соединение 5 кубов',members:Array.from({length:5},(_,i)=>`cube5_${i}`),kind:'cube'},
  {id:'tetra10',name:'Соединение 10 тетраэдров',members:Array.from({length:10},(_,i)=>`tetra10_${i}`),kind:'tetrahedron'},
];
export const compoundOf = id => COMPOUNDS.find(c=>c.members.includes(id));
export const COMPONENT_COLORS=[0xff668d,0x66d9ff,0xffd166,0x7be6b0,0xb195ff,0xffae73,0xa7e8f2,0xe1b6ff,0xb4dc72,0xf59ddd];
