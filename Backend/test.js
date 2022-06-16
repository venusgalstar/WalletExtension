// const add = (x, y) => x + y;
var ff = 0;
function ok()
{
    ff++;
    try {
        if( ff < 3 )
        {
            let result = add("", 20);
            console.log(result);
        }
      } catch (e) {
        console.log({ name: e.name, message: e.message });
        setTimeout(ok, 1000);
        return false;
      }
      console.log('Bye', ff);
      return true;
}

var res = ok();

console.log(res);
