/* eslint-disable no-undef */
require("./init");

const dataSource = getDataSource();

describe("Loopback Firebase", () => {
  const Customer = dataSource.createModel("customer", {
    name: String,
    emails: [String],
    age: Number,
  });

  let customer1 = undefined;
  let customer2 = undefined;

  it("Should get all entities without records", (done) => {
    Customer.all((error, customer) => {
      customer.should.have.length(0);

      done(error, customer);
    });
  });

  it("Should create a Customer entity", (done) => {
    Customer.create(
      {
        name: "Henrique Carvalho da Cruz",
        emails: ["noreply@henrique.me", "foo@bar.com"],
        age: 28,
      },
      (error, customer) => {
        customer1 = customer;

        customer.should.have.property("name", "Henrique Carvalho da Cruz");
        customer.should.have.property("emails").with.lengthOf(2);

        done(error, customer);
      }
    );
  });

  it("Should create another Customer entity", (done) => {
    Customer.create(
      {
        name: "Orion Cruz",
        emails: ["orion@cruz.com"],
        type: "Animal",
        age: 4,
      },
      (error, customer) => {
        customer2 = customer;

        customer.should.have.property("name", "Orion Cruz");
        customer.should.have.property("emails").with.lengthOf(1);

        done(error, customer);
      }
    );
  });

  it("Should count 2 entities", (done) => {
    Customer.count((error, customer) => {
      customer.should.be.exactly(2).and.be.a.Number();

      done(error, customer);
    });
  });

  it("Should find an Entity by id", (done) => {
    Customer.find({ where: { id: customer1.id } }, (error, customer) => {
      // eslint-disable-next-line no-unused-expressions
      customer.should.be.object;
      customer.should.containDeep({ name: customer1.name });

      done(error, customer);
    });
  });

  it("Should get object properties", (done) => {
    Customer.find({ where: { id: customer1.id } }, (error, customer) => {
      customer.should.containDeep({ name: customer1.name });
      customer.should.containDeep({ age: customer1.age });

      done(error, customer);
    });
  });

  it("Should get all entities", (done) => {
    Customer.all((error, customer) => {
      customer.should.have.length(2);
      customer.should.containDeep([{ id: customer1.id }]);
      customer.should.containDeep([{ id: customer2.id }]);

      done(error, customer);
    });
  });

  it("Should get one entity from all using limit filter", (done) => {
    Customer.all({ limit: 1 }, (error, customer) => {
      customer.should.have.length(1);
      customer.should.containDeep([{ id: customer1.id }]);

      done(error);
    });
  });

  it("Should get Orion as first Entity in the array", (done) => {
    Customer.all({ order: "age DESC" }, (error, customer) => {
      customer.should.have.length(2);
      customer.should.containDeep([{ id: customer2.id }]);

      done(error);
    });
  });

  it("Should get a specific field from all entities", (done) => {
    Customer.all({ fields: { emails: true } }, (error, customer) => {
      customer.should.have.length(2);
      customer.should.containDeep([{ emails: customer1.emails }]);
      customer.should.not.containDeep([{ age: customer1.age }]);

      done(error);
    });
  });

  it("Should find entities by age less than 30", (done) => {
    Customer.find({ where: { age: { lt: 30 } } }, (error, customer) => {
      customer.should.have.length(2);
      customer.should.containDeep([{ age: customer1.age }]);
      customer.should.containDeep([{ id: customer1.id }]);

      done(error);
    });
  });

  it("Should find an entity by age equals to 28", (done) => {
    Customer.find({ where: { age: customer1.age } }, (error, customer) => {
      customer.should.have.length(1);
      customer.should.containDeep([{ age: customer1.age }]);
      customer.should.containDeep([{ id: customer1.id }]);

      done(error);
    });
  });

  it("Should replace attributes for a model entity", (done) => {
    Customer.replaceById(
      customer1.id,
      { emails: ["bar@example.com"] },
      { validate: true },
      (error, customer) => {
        customer.should.have.property("emails").with.lengthOf(1);

        done(error, customer);
      }
    );
  });

  it("Should replace values for models with same property value", (done) => {
    Customer.update(
      { where: { type: "Animal", name: "Orion Cruz" } },
      { emails: ["animal@example.com", "orion@cruz.com"], name: "Orionz" },
      (error, customer) => {
        customer.should.containDeep([{ emails: ["animal@example.com"] }]);

        done(error);
      }
    );
  });

  it("Should find an entity by age equals to 4, keeping the age and id properties", (done) => {
    Customer.find(
      { where: { age: customer2.age }, fields: { age: true, id: true } },
      (error, customer) => {
        customer.should.have.length(1);
        customer.should.containDeep([{ age: customer2.age }]);
        customer.should.containDeep([{ id: customer2.id }]);

        done(error);
      }
    );
  });

  it("Should delete an entity", (done) => {
    Customer.destroyAll({ id: customer1.id }, (error, customer) => {
      done(error, customer);
    });
  });

  it("Should delete all entities", (done) => {
    Customer.destroyAll(null, (error, customer) => {
      done(error, customer);
    });
  });
});
