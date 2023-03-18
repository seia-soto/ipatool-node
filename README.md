# IPATool-Node

The Node.JS library port of [IPATool](https://github.com/majd/ipatool).
The update from IPATool will be made infrequently.

See also:
- Golang version (cli, origin): https://github.com/majd/ipatool
- Python version (cli): https://github.com/NyaMisty/ipatool-py

This is a **library for developers**, and will not provide any CLI interface.

## Usage

> **Warning** All functionalities are not implemented yet.

> **Warning** This library is based on **ESM**, and **CJS module will not be provided** in future.

I provide this package with TypeScript, please see the source code and comment for detailed usage.

```typescript
import ipatool from 'ipatool';

const instance = await ipatool.createInstance();
const isMfaRequired = await ipatool.signIn(instance, {email: 'user@domain.tld', password: ''});

if (isMfaRequired) {
  const isMfaRequired = await ipatool.signIn(instance, {email: 'user@domain.tld', password: '', token: '000000'});
}
```

### TODO

- [x] Sign in
- [ ] Purchase
- [x] Download
- [ ] iTunes APIs for searching packages

## LICENSE

This library is distributed under [MIT License](/LICENSE) which follows the original repository.
